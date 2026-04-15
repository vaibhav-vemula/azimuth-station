import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OrbitalVault } from "../target/types/orbital_vault";
import {
  createMint, mintTo, getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { assert } from "chai";

describe("orbital_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.OrbitalVault as Program<OrbitalVault>;
  const authority = provider.wallet as anchor.Wallet;

  let azmMint: anchor.web3.PublicKey;
  let vaultConfigPda: anchor.web3.PublicKey;
  let vaultAtaPda: anchor.web3.PublicKey;
  const station = anchor.web3.Keypair.generate();

  const [vaultConfig] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")],
    program.programId
  );

  before(async () => {
    vaultConfigPda = vaultConfig;
    // Airdrop to station
    const sig = await provider.connection.requestAirdrop(station.publicKey, 2e9);
    await provider.connection.confirmTransaction(sig);
    // Create AZM mint
    azmMint = await createMint(provider.connection, authority.payer, authority.publicKey, null, 0);
    // Derive vault ATA
    const { address } = await getOrCreateAssociatedTokenAccount(
      provider.connection, authority.payer, azmMint, vaultConfigPda, true
    );
    vaultAtaPda = address;
    // Fund vault with 10000 AZM
    await mintTo(provider.connection, authority.payer, azmMint, vaultAtaPda, authority.payer, 10000);
  });

  it("initializes vault", async () => {
    await program.methods.initialize(
      new anchor.BN(300),   // epoch interval 5 min
      new anchor.BN(2),     // poa reward
      new anchor.BN(1),     // porx base reward
      new anchor.BN(100),   // stake amount
      new anchor.BN(7 * 24 * 3600), // unstake cooldown
      new anchor.BN(1)      // heartbeat threshold
    ).accounts({
      vaultConfig: vaultConfigPda,
      vaultAta: vaultAtaPda,
      azmMint,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    }).rpc();

    const cfg = await program.account.vaultConfig.fetch(vaultConfigPda);
    assert.equal(cfg.poaEpochInterval.toNumber(), 300);
    assert.equal(cfg.stationList.length, 0);
  });

  it("registers a station", async () => {
    const [stationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("station"), station.publicKey.toBuffer()],
      program.programId
    );
    await program.methods.registerStation("Test Station Alpha").accounts({
      vaultConfig: vaultConfigPda,
      stationAccount: stationPda,
      station: station.publicKey,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const s = await program.account.station.fetch(stationPda);
    assert.equal(s.registered, true);
    assert.equal(s.active, true);
    assert.equal(s.location, "Test Station Alpha");
  });

  it("sends a heartbeat", async () => {
    const [stationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("station"), station.publicKey.toBuffer()],
      program.programId
    );
    await program.methods.heartbeat().accounts({
      station: stationPda,
      authority: station.publicKey,
    }).signers([station]).rpc();

    const s = await program.account.station.fetch(stationPda);
    assert.equal(s.heartbeatCount.toNumber(), 1);
  });

  it("submits a PoRx proof", async () => {
    const passId = Array.from(anchor.web3.Keypair.generate().publicKey.toBytes());
    const merkle = Array.from(anchor.web3.Keypair.generate().publicKey.toBytes());
    const [stationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("station"), station.publicKey.toBuffer()], program.programId
    );
    const [porxPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("porx"), Buffer.from(passId), station.publicKey.toBuffer()], program.programId
    );
    await program.methods.submitPorx(passId, 50, 100, merkle, -800, 50).accounts({
      vaultConfig: vaultConfigPda,
      station: stationPda,
      porxProof: porxPda,
      authority: station.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([station]).rpc();

    const proof = await program.account.poRxProof.fetch(porxPda);
    assert.equal(proof.packetCount, 50);
    assert.equal(proof.rewardAmount.toNumber(), 50);
  });
});
