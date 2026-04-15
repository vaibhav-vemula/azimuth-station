const fs = require("fs");
const path = require("path");
const { PublicKey } = require("@solana/web3.js");
const { program, keypair, vaultConfigPda, programId } = require("./config");
const { uploadToArweave, getIrys } = require("./packetPublisher");
const { acquireLock, releaseLock } = require("./proofSubmitter");

const IS_PRIMARY = process.env.IS_PRIMARY === "true";
const POLL_INTERVAL = 15_000;
const IRYS_GRAPHQL = process.env.IRYS_GRAPHQL || "https://devnet.irys.xyz/graphql";
const IRYS_GATEWAY = process.env.IRYS_NODE || "https://devnet.irys.xyz";
const MERGER_STATE_FILE = path.resolve(__dirname, "merger_state.json");

function loadMergerState() {
  try {
    const raw = fs.readFileSync(MERGER_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { mergedPasses: new Set(parsed.mergedPasses || []), cursor: parsed.cursor || null };
  } catch { return { mergedPasses: new Set(), cursor: null }; }
}
function saveMergerState() {
  const tmp = MERGER_STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ mergedPasses: [...mergedPasses], cursor }, null, 2));
  fs.renameSync(tmp, MERGER_STATE_FILE);
}

const { mergedPasses, cursor: _savedCursor } = loadMergerState();
let cursor = _savedCursor;
const passAnnouncements = {};
let pollTimer = null;

async function fetchArweavePackets(afterCursor) {
  const query = `{
    transactions(
      tags: [
        { name: "App-Name", values: ["azimuth"] },
        { name: "Data-Type", values: ["packets"] }
      ],
      order: ASC,
      first: 100
      ${afterCursor ? `, after: "${afterCursor}"` : ""}
    ) {
      edges {
        cursor
        node {
          id
          tags { name value }
        }
      }
    }
  }`;

  const res = await fetch(IRYS_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data?.transactions?.edges || [];
}

async function downloadFromArweave(txId) {
  const res = await fetch(`${IRYS_GATEWAY}/${txId}`);
  if (res.ok) return await res.json();
  throw new Error(`Arweave fetch failed for ${txId}`);
}

function mergePackets(...maps) {
  const merged = {};
  for (const map of maps) for (const [id, b64] of Object.entries(map)) if (!(id in merged)) merged[id] = b64;
  return merged;
}

function reconstructJpeg(mergedPackets, totalPackets) {
  const chunks = [];
  let avgSize = 0, count = 0;
  for (const b64 of Object.values(mergedPackets)) { avgSize += Buffer.from(b64, "base64").length; count++; }
  if (count > 0) avgSize = Math.floor(avgSize / count);
  for (let i = 0; i < totalPackets; i++) {
    const b64 = mergedPackets[String(i)];
    chunks.push(b64 ? Buffer.from(b64, "base64") : Buffer.alloc(avgSize, 0));
  }
  return Buffer.concat(chunks);
}

async function recordAndAnnounce(passId, arweaveTxId, recovered, total) {
  const [stationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("station"), keypair.publicKey.toBuffer()], programId
  );
  const [imageRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("image"), Buffer.from(passId.replace("0x", ""), "hex")], programId
  );
  try {
    await acquireLock();
    const passIdArr = Array.from(Buffer.from(passId.replace("0x", ""), "hex"));
    const sig = await program.methods.recordImage(passIdArr, arweaveTxId, recovered, total)
      .accounts({ station: stationPda, imageRecord: imageRecordPda, authority: keypair.publicKey,
        systemProgram: require("@solana/web3.js").SystemProgram.programId })
      .rpc();
    console.log(`[MERGE] Recorded on-chain — TX: ${sig}`);
  } catch (err) {
    console.error(`[MERGE] recordImage failed: ${err.message}`);
  } finally { releaseLock(); }
}

async function tryMerge(passId) {
  const entries = passAnnouncements[passId];
  if (!entries || entries.length < 2 || mergedPasses.has(passId)) return;
  mergedPasses.add(passId);
  console.log(`\n[MERGE] Merging ${entries.length} stations for pass ${passId.slice(0, 10)}...`);
  try {
    const packetMaps = [];
    let totalPackets = 0;
    for (const entry of entries) {
      const data = await downloadFromArweave(entry.arweaveTxId);
      packetMaps.push(data.packets || {});
      totalPackets = Math.max(totalPackets, entry.totalPackets);
    }
    const merged = mergePackets(...packetMaps);
    const recovered = Object.keys(merged).length;
    const jpegBuffer = reconstructJpeg(merged, totalPackets);
    const tags = [
      { name: "App-Name",     value: "azimuth" },
      { name: "Content-Type", value: "image/jpeg" },
      { name: "Data-Type",    value: "merged-image" },
      { name: "passId",       value: passId },
      { name: "recovered",    value: String(recovered) },
      { name: "total",        value: String(totalPackets) },
      { name: "stations",     value: entries.map(e => e.station).join(",") },
      { name: "timestamp",    value: String(Math.floor(Date.now() / 1000)) },
    ];
    const irys = await getIrys();
    const receipt = await irys.upload(jpegBuffer, { tags });
    console.log(`[MERGE] Arweave TX: ${receipt.id}`);
    await recordAndAnnounce(passId, receipt.id, recovered, totalPackets);
    saveMergerState();
  } catch (err) {
    console.error(`[MERGE] Failed: ${err.message}`);
    mergedPasses.delete(passId);
  }
}

function handleEdge(edge) {
  const tags = Object.fromEntries(edge.node.tags.map(t => [t.name, t.value]));
  if (tags["Data-Type"] !== "packets") return;
  const { passId, station, packetCount, totalPackets } = tags;
  if (!passId || !station) return;
  if (!passAnnouncements[passId]) passAnnouncements[passId] = [];
  if (passAnnouncements[passId].some(e => e.station === station)) return;
  passAnnouncements[passId].push({ station, arweaveTxId: edge.node.id, packetCount: Number(packetCount), totalPackets: Number(totalPackets) });
  console.log(`\n[MERGE] Station ${station.slice(0,8)}... announced for pass ${passId.slice(0,10)}... (${passAnnouncements[passId].length} station(s))`);
  tryMerge(passId).catch(err => console.error("[MERGE] tryMerge error:", err.message));
}

function startMerger() {
  if (!IS_PRIMARY) { console.log("[MERGE] Not primary — merger disabled"); return; }
  console.log("[MERGE] Primary station — image merger started");
  const poll = async () => {
    const edges = await fetchArweavePackets(cursor).catch(() => []);
    for (const edge of edges) {
      cursor = edge.cursor;
      handleEdge(edge);
    }
    if (edges.length > 0) saveMergerState();
  };
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL);
}
function stopMerger() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

module.exports = { startMerger, stopMerger };
