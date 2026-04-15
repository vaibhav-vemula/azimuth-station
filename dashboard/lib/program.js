import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID);
const AZM_MINT = new PublicKey(process.env.NEXT_PUBLIC_AZM_MINT);

let _program = null;

export function getProgram() {
  if (_program) return _program;
  const connection = new Connection(RPC_URL, "confirmed");
  // Read-only provider (no wallet needed for fetching)
  const provider = new anchor.AnchorProvider(
    connection,
    { publicKey: PublicKey.default, signTransaction: async t => t, signAllTransactions: async t => t },
    {}
  );
  const IDL = require("../../target/idl/orbital_vault.json");
  _program = new anchor.Program(IDL, provider);
  return _program;
}

export function getVaultConfigPda() {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("vault_config")], PROGRAM_ID);
  return pda;
}

export function getStationPda(stationPubkey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("station"), new PublicKey(stationPubkey).toBuffer()], PROGRAM_ID
  );
  return pda;
}

export async function fetchVaultConfig() {
  const program = getProgram();
  return await program.account.vaultConfig.fetch(getVaultConfigPda());
}

export async function fetchStationInfo(stationPubkey) {
  const program = getProgram();
  return await program.account.station.fetch(getStationPda(stationPubkey));
}

export async function fetchPoRxProofs(stationPubkey) {
  const program = getProgram();
  const key = new PublicKey(stationPubkey);
  return await program.account.poRxProof.all([
    { memcmp: { offset: 8, bytes: key.toBase58() } }
  ]);
}

export async function fetchAzmBalance(stationPubkey) {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const ata = getAssociatedTokenAddressSync(AZM_MINT, new PublicKey(stationPubkey));
    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount;
  } catch { return null; }
}
