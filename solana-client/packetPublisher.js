const { Uploader } = require("@irys/upload");
const { Solana } = require("@irys/upload-solana");
const { keypair } = require("./config");

let irysClient = null;

async function getIrys() {
  if (irysClient) return irysClient;
  irysClient = await Uploader(Solana)
    .withWallet(Buffer.from(keypair.secretKey).toString("hex"))
    .withRpc(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")
    .devnet()
    .build();
  return irysClient;
}

async function uploadToArweave(data, tags = []) {
  const irys = await getIrys();
  const buffer = Buffer.from(JSON.stringify(data), "utf-8");
  const receipt = await irys.upload(buffer, { tags });
  return receipt.id;
}

async function publishPackets(receptionData) {
  const { passId, packetCount, totalPackets, packetBytes, avgRssi, avgSnr, timestamp } = receptionData;
  if (!packetBytes || Object.keys(packetBytes).length === 0) {
    console.warn("[PKT] No packet bytes — skipping publish");
    return null;
  }
  console.log(`[PKT] Uploading ${packetCount}/${totalPackets} packets to Arweave...`);
  try {
    const payload = { passId, station: keypair.publicKey.toBase58(), packetCount, totalPackets, avgRssi, avgSnr, timestamp, packets: packetBytes };
    const tags = [
      { name: "App-Name",     value: "azimuth" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type",    value: "packets" },
      { name: "passId",       value: passId },
      { name: "station",      value: keypair.publicKey.toBase58() },
      { name: "packetCount",  value: String(packetCount) },
      { name: "totalPackets", value: String(totalPackets) },
    ];
    const arweaveTxId = await uploadToArweave(payload, tags);
    console.log(`[PKT] Uploaded to Arweave: ${arweaveTxId}`);
    return arweaveTxId;
  } catch (err) {
    console.error(`[PKT] Failed: ${err.message}`);
    return null;
  }
}

module.exports = { publishPackets, uploadToArweave, getIrys };
