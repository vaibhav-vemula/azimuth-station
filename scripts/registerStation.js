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

async function main() {
  // ANCHOR_WALLET = admin authority (pays for account rent, signs as authority)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);
  const programId = program.programId;
  const authority = provider.wallet.publicKey;

  // STATION_KEYPAIR_PATH = this machine's station wallet (signs + stakes 0.5 SOL)
  const stationKeyPath = process.env.STATION_KEYPAIR_PATH;
  if (!stationKeyPath) {
    console.error("Set STATION_KEYPAIR_PATH in scripts/.env");
    process.exit(1);
  }
  const stationKeypair = loadKeypair(stationKeyPath);
  const stationPubkey = stationKeypair.publicKey;
  const location = process.env.STATION_LOCATION || "Station";

  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")], programId
  );
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

main().catch(console.error);
