const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const IDL = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../target/idl/orbital_vault.json"), "utf-8"
));

// Load keypair
let keypair;
if (process.env.OPERATOR_KEYPAIR_PATH) {
  const raw = JSON.parse(fs.readFileSync(
    path.resolve(process.env.OPERATOR_KEYPAIR_PATH.replace("~", process.env.HOME)), "utf-8"
  ));
  keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
} else if (process.env.OPERATOR_PRIVATE_KEY) {
  const bs58 = require("bs58");
  keypair = Keypair.fromSecretKey(bs58.decode(process.env.OPERATOR_PRIVATE_KEY));
} else {
  console.error("ERROR: Set OPERATOR_KEYPAIR_PATH or OPERATOR_PRIVATE_KEY");
  process.exit(1);
}

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  "confirmed"
);

const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

const programId = new PublicKey(process.env.ORBITAL_VAULT_PROGRAM_ID);
const program = new anchor.Program(IDL, provider);

const [vaultConfigPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_config")], programId
);
const [stationPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("station"), keypair.publicKey.toBuffer()], programId
);

const azmMint = new PublicKey(process.env.AZM_MINT);

module.exports = {
  connection,
  provider,
  program,
  keypair,
  wallet,
  programId,
  vaultConfigPda,
  stationPda,
  azmMint,
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL_MS || "60000"),
  SCHEDULE_POLL_INTERVAL: parseInt(process.env.SCHEDULE_POLL_INTERVAL_MS || "30000"),
  STATE_FILE: path.resolve(__dirname, process.env.STATE_FILE || "../ground_station/solana_state.json"),
};
