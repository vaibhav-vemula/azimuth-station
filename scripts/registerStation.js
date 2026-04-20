require("dotenv").config({ path: "scripts/.env" });
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const idl = require("../target/idl/orbital_vault.json");

function loadKeypair(envPath) {
  const expanded = envPath.replace(/^~/, process.env.HOME || "");
  return anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(expanded, "utf-8")))
  );
}

async function registerOne(program, programId, vaultConfigPda, authority, stationKeypair, location) {
  const stationPubkey = stationKeypair.publicKey;
  const [stationPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("station"), stationPubkey.toBuffer()], programId
  );

  await program.methods.registerStation(location).accounts({
    vaultConfig: vaultConfigPda,
    stationAccount: stationPda,
    station: stationPubkey,
    authority,
    systemProgram: anchor.web3.SystemProgram.programId,
  }).signers([stationKeypair]).rpc();

  console.log(`Registered: ${location}`);
  console.log(`  Pubkey: ${stationPubkey.toBase58()}`);
  console.log(`  PDA:    ${stationPda.toBase58()}`);
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);
  const programId = program.programId;
  const authority = provider.wallet.publicKey;

  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")], programId
  );

  const stations = [
    { path: process.env.STATION1_KEYPAIR_PATH, location: process.env.STATION1_LOCATION || "Station 1 — Mac" },
    { path: process.env.STATION2_KEYPAIR_PATH, location: process.env.STATION2_LOCATION || "Station 2 — Raspberry Pi" },
  ].filter(s => s.path);

  if (stations.length === 0) {
    console.error("Set STATION1_KEYPAIR_PATH and/or STATION2_KEYPAIR_PATH in scripts/.env");
    process.exit(1);
  }

  for (const { path, location } of stations) {
    await registerOne(program, programId, vaultConfigPda, authority, loadKeypair(path), location);
  }
}

main().catch(console.error);
