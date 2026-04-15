import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OrbitalVault } from "../target/types/orbital_vault";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.OrbitalVault as Program<OrbitalVault>;
  const authority = (provider.wallet as anchor.Wallet).publicKey;

  const { mint, vaultAta } = JSON.parse(fs.readFileSync("scripts/.token.json", "utf-8"));
  const azmMint = new anchor.web3.PublicKey(mint);
  const vaultAtaPda = new anchor.web3.PublicKey(vaultAta);

  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")], program.programId
  );

  await program.methods.initialize(
    new anchor.BN(6 * 3600),  // 6 hour epochs
    new anchor.BN(2),          // 2 AZM PoA reward
    new anchor.BN(1),          // 1 AZM per packet PoRx reward
    new anchor.BN(100),        // 100 AZM stake
    new anchor.BN(7 * 24 * 3600), // 7 day unstake cooldown
    new anchor.BN(1)           // 1 heartbeat threshold
  ).accounts({
    vaultConfig: vaultConfigPda, vaultAta: vaultAtaPda,
    azmMint, authority,
    systemProgram: anchor.web3.SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  }).rpc();

  console.log("Vault initialized. Config PDA:", vaultConfigPda.toBase58());
}
main().catch(console.error);
