require("dotenv").config({ path: "scripts/.env" });
const anchor = require("@coral-xyz/anchor");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const fs = require("fs");
const idl = require("../target/idl/orbital_vault.json");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);
  const programId = program.programId;
  const authority = provider.wallet.publicKey;

  const { mint, vaultAta } = JSON.parse(fs.readFileSync("scripts/.token.json", "utf-8"));
  const azmMint = new anchor.web3.PublicKey(mint);
  const vaultAtaPda = new anchor.web3.PublicKey(vaultAta);

  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")], programId
  );

  await program.methods.initialize(
    new anchor.BN(10 * 60),        // 10 minute epochs (demo)
    new anchor.BN(2),              // 2 AZM PoA reward per epoch
    new anchor.BN(1),              // 1 AZM per packet PoRx reward
    new anchor.BN(500_000_000),    // 0.5 SOL stake (in lamports)
    new anchor.BN(7 * 24 * 3600), // 7 day unstake cooldown
    new anchor.BN(1)               // 1 heartbeat threshold
  ).accounts({
    vaultConfig: vaultConfigPda,
    vaultAta: vaultAtaPda,
    azmMint,
    authority,
    systemProgram: anchor.web3.SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  }).rpc();

  console.log("Vault initialized. Config PDA:", vaultConfigPda.toBase58());
}

main().catch(console.error);
