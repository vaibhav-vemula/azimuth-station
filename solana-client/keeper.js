const { PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { program, keypair, connection, vaultConfigPda, programId, azmMint } = require("./config");

let keeperTimer = null;

function stationPdaFor(pubkey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("station"), pubkey.toBuffer()], programId
  );
  return pda;
}

async function checkPoaEpoch() {
  try {
    const cfg = await program.account.vaultConfig.fetch(vaultConfigPda);
    const now = Math.floor(Date.now() / 1000);
    const nextEpoch = cfg.poaEpochStart.toNumber() + cfg.poaEpochInterval.toNumber();
    if (now < nextEpoch) return;

    console.log(`[KEEPER] PoA epoch due — settling epoch #${cfg.poaEpochCount.toNumber() + 1}`);

    // Build remaining accounts: [station_pda, station_ata] for each station
    const vaultAta = getAssociatedTokenAddressSync(azmMint, vaultConfigPda, true);
    const remainingAccounts = [];

    for (const stationKey of cfg.stationList) {
      const stationPda = stationPdaFor(stationKey);
      // Ensure the station's AZM ATA exists before settling (token transfer will fail otherwise)
      await getOrCreateAssociatedTokenAccount(connection, keypair, azmMint, stationKey, false);
      const stationAta = getAssociatedTokenAddressSync(azmMint, stationKey, false);
      remainingAccounts.push({ pubkey: stationPda, isSigner: false, isWritable: true });
      remainingAccounts.push({ pubkey: stationAta, isSigner: false, isWritable: true });
    }

    const sig = await program.methods.settlePoaEpoch()
      .accounts({ vaultConfig: vaultConfigPda, vaultAta, tokenProgram: TOKEN_PROGRAM_ID })
      .remainingAccounts(remainingAccounts)
      .rpc();
    console.log(`[KEEPER] PoA epoch settled — TX: ${sig}`);
  } catch (err) {
    console.error(`[KEEPER] PoA settle error: ${err.message}`);
    if (err.logs) console.error("[KEEPER] Logs:", err.logs.join("\n"));
  }
}

async function checkPorxPayouts() {
  try {
    const proofs = await program.account.poRxProof.all();

    for (const { publicKey, account } of proofs) {
      if (!account.claimed || !account.verified || account.paid) continue;
      const stationKey = account.station;
      const stationAta = getAssociatedTokenAddressSync(azmMint, stationKey, false);
      const vaultAta = getAssociatedTokenAddressSync(azmMint, vaultConfigPda, true);
      const stationPda = stationPdaFor(stationKey);

      try {
        const sig = await program.methods.executePorxPayout(Array.from(account.passId))
          .accounts({
            vaultConfig: vaultConfigPda,
            porxProof: publicKey,
            vaultAta,
            stationAta,
            stationAuthority: stationKey,
            station: stationPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        console.log(`[KEEPER] PoRx payout for ${stationKey.toBase58().slice(0, 8)}... — TX: ${sig}`);
      } catch (err) {
        console.error(`[KEEPER] PoRx payout failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[KEEPER] PoRx scan error: ${err.message}`);
  }
}

async function checkUnstakes() {
  try {
    const stations = await program.account.station.all();
    const now = Math.floor(Date.now() / 1000);

    for (const { account } of stations) {
      if (account.active || !account.registered || account.unstakeAt.toNumber() === 0) continue;
      if (now < account.unstakeAt.toNumber()) continue;

      const stationAuthority = account.authority;
      const staPda = stationPdaFor(stationAuthority);

      try {
        const sig = await program.methods.executeUnstake()
          .accounts({
            vaultConfig: vaultConfigPda,
            station: staPda,
            stationAuthority,
          }).rpc();
        console.log(`[KEEPER] Unstake executed for ${stationAuthority.toBase58().slice(0,8)}... — TX: ${sig}`);
      } catch (err) {
        console.error(`[KEEPER] Unstake execute failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[KEEPER] Unstake scan error: ${err.message}`);
  }
}

async function runKeeperTick() {
  await checkPoaEpoch();
  await checkPorxPayouts();
  await checkUnstakes();
}

function startKeeper(intervalMs = 30_000) {
  console.log(`[KEEPER] Starting keeper bot — tick every ${intervalMs / 1000}s`);
  runKeeperTick();
  keeperTimer = setInterval(runKeeperTick, intervalMs);
}
function stopKeeper() { if (keeperTimer) { clearInterval(keeperTimer); keeperTimer = null; } }

module.exports = { startKeeper, stopKeeper };
