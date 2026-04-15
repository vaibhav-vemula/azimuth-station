import * as anchor from "@coral-xyz/anchor";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = (provider.wallet as anchor.Wallet).payer;

  console.log("Creating AZM SPL token...");
  const mint = await createMint(provider.connection, payer, payer.publicKey, null, 0);
  console.log("AZM Mint:", mint.toBase58());

  // Derive vault config PDA to fund it
  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")],
    new anchor.web3.PublicKey(process.env.ORBITAL_VAULT_PROGRAM_ID!)
  );

  const vaultAta = await getOrCreateAssociatedTokenAccount(
    provider.connection, payer, mint, vaultConfigPda, true
  );
  console.log("Vault ATA:", vaultAta.address.toBase58());

  await mintTo(provider.connection, payer, mint, vaultAta.address, payer, 1_000_000);
  console.log("Minted 1,000,000 AZM to vault");

  fs.writeFileSync("scripts/.token.json", JSON.stringify({ mint: mint.toBase58(), vaultAta: vaultAta.address.toBase58() }, null, 2));
  console.log("Saved to scripts/.token.json");
}
main().catch(console.error);
