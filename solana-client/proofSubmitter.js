const fs = require("fs");
const path = require("path");
const { PublicKey } = require("@solana/web3.js");
const { program, keypair, vaultConfigPda, stationPda, programId } = require("./config");
const { publishPackets } = require("./packetPublisher");

const EVENT_FILE = path.resolve(__dirname, "../ground_station/reception_event.json");
let lastProcessedPass = null;
let txLock = false;

async function acquireLock() {
  while (txLock) await new Promise(r => setTimeout(r, 500));
  txLock = true;
}
function releaseLock() { txLock = false; }

function porxPda(passIdBytes) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("porx"), passIdBytes, keypair.publicKey.toBuffer()],
    programId
  );
  return pda;
}

function passIdToBytes(passIdHex) {
  const hex = passIdHex.startsWith("0x") ? passIdHex.slice(2) : passIdHex;
  return Buffer.from(hex, "hex");
}

async function isAlreadySubmitted(passIdBytes) {
  try {
    const pda = porxPda(passIdBytes);
    const proof = await program.account.poRxProof.fetchNullable(pda);
    return proof !== null;
  } catch { return false; }
}

async function isAlreadyClaimed(passIdBytes) {
  try {
    const pda = porxPda(passIdBytes);
    const proof = await program.account.poRxProof.fetchNullable(pda);
    return proof ? proof.claimed : false;
  } catch { return false; }
}

async function submitProof(receptionData) {
  const { passId: passIdHex, packetCount, totalPackets, packetHashes, avgRssi, avgSnr } = receptionData;
  const passIdBytes = passIdToBytes(passIdHex);
  const passIdArr = Array.from(passIdBytes);

  // Compute merkle: hash concatenation of packet hashes
  const crypto = require("crypto");
  const merkleInput = packetHashes.map(h => Buffer.from(h.replace("0x",""), "hex"));
  const merkleHash = merkleInput.length > 0
    ? crypto.createHash("sha256").update(Buffer.concat(merkleInput)).digest()
    : Buffer.alloc(32);
  const merkleArr = Array.from(merkleHash);

  console.log(`[PORX] Submitting proof for pass ${passIdHex.slice(0, 10)}...`);
  try {
    await acquireLock();
    const pda = porxPda(passIdBytes);
    let submitSig = null;

    if (!(await isAlreadySubmitted(passIdBytes))) {
      submitSig = await program.methods
        .submitPorx(passIdArr, packetCount, totalPackets, merkleArr, avgRssi, avgSnr)
        .accounts({ vaultConfig: vaultConfigPda, station: stationPda, porxProof: pda,
          authority: keypair.publicKey,
          systemProgram: require("@solana/web3.js").SystemProgram.programId })
        .rpc();
      console.log(`[PORX] Proof submitted — TX: ${submitSig}`);
    }

    if (await isAlreadyClaimed(passIdBytes)) {
      return { success: true, submitSig, claimSig: null };
    }

    const claimSig = await program.methods.claimPorxReward(passIdArr)
      .accounts({ station: stationPda, porxProof: pda, authority: keypair.publicKey })
      .rpc();
    console.log(`[PORX] Reward claimed — TX: ${claimSig}`);
    return { success: true, submitSig, claimSig };
  } catch (err) {
    console.error(`[PORX] Failed: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    releaseLock();
  }
}

async function verifyStation(stationPubkey, passIdHex) {
  const passIdBytes = passIdToBytes(passIdHex);
  const passIdArr = Array.from(passIdBytes);
  const targetKey = new PublicKey(stationPubkey);
  const [targetProofPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("porx"), passIdBytes, targetKey.toBuffer()], programId
  );
  const [verifierProofPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("porx"), passIdBytes, keypair.publicKey.toBuffer()], programId
  );
  try {
    await acquireLock();
    const sig = await program.methods.verifyPorx(passIdArr)
      .accounts({
        verifierStation: stationPda,
        porxProof: targetProofPda,
        verifierProof: verifierProofPda,
        targetStation: targetKey,
        verifier: keypair.publicKey,
      }).rpc();
    console.log(`[PORX] Verified — TX: ${sig}`);
    return { success: true, txSig: sig };
  } catch (err) {
    console.error(`[PORX] Verify failed: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    releaseLock();
  }
}

async function checkAndVerifyPeers() {
  try {
    const proofs = await program.account.poRxProof.all();
    for (const { account } of proofs) {
      if (account.station.equals(keypair.publicKey)) continue;
      if (!account.claimed || account.verified || account.paid) continue;
      const [myProofPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("porx"), Buffer.from(account.passId), keypair.publicKey.toBuffer()], programId
      );
      const myProof = await program.account.poRxProof.fetchNullable(myProofPda);
      if (!myProof) continue;
      await verifyStation(account.station.toBase58(), "0x" + Buffer.from(account.passId).toString("hex"));
    }
  } catch {}
}

function watchForReceptions(callback) {
  console.log(`[PORX] Watching for reception events at ${EVENT_FILE}`);
  let processing = false;

  setInterval(async () => {
    if (processing) return;
    try {
      if (!fs.existsSync(EVENT_FILE)) return;
      const data = JSON.parse(fs.readFileSync(EVENT_FILE, "utf-8"));
      if (data.passId === lastProcessedPass) return;
      processing = true;
      lastProcessedPass = data.passId;
      try { fs.unlinkSync(EVENT_FILE); } catch {}
      const result = await submitProof(data);
      if (callback) callback(result);
      publishPackets(data).catch(err => console.error(`[PORX] Packet publish error: ${err.message}`));
    } catch {} finally { processing = false; }
  }, 5000);

  setInterval(checkAndVerifyPeers, 30_000);
}

module.exports = { submitProof, verifyStation, watchForReceptions, acquireLock, releaseLock };
