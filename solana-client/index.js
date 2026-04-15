#!/usr/bin/env node
const { program, keypair, vaultConfigPda, SCHEDULE_POLL_INTERVAL } = require("./config");
const { startHeartbeatLoop, stopHeartbeatLoop, getStatus: getHbStatus } = require("./heartbeat");
const { watchForReceptions } = require("./proofSubmitter");
const { startTracking, stopTracking } = require("./statePoller");
const { updateState, startFlushing, stopFlushing, flush } = require("./stateWriter");
const { startMerger, stopMerger } = require("./imageMerger");
const { startKeeper, stopKeeper } = require("./keeper");

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║       AZIMUTH SOLANA CLIENT v1.0         ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Station:  ${keypair.publicKey.toBase58()}`);
  console.log(`Program:  ${process.env.ORBITAL_VAULT_PROGRAM_ID}`);
  console.log();

  try {
    const station = await program.account.station.fetch(
      require("./config").stationPda
    );
    if (!station.registered) {
      console.error("ERROR: Station not registered. Run scripts/registerStation.ts first.");
      process.exit(1);
    }
    console.log(`Station registered: ${station.location}`);
    console.log(`Active: ${station.active}`);
    console.log();
  } catch (err) {
    console.error(`ERROR: Cannot read station account: ${err.message}`);
    process.exit(1);
  }

  startHeartbeatLoop();
  startTracking(SCHEDULE_POLL_INTERVAL, (state) => {
    updateState("station", state.station);
    updateState("poa", state.poa);
    updateState("porx", state.porx);
    updateState("heartbeat", getHbStatus());
    const remaining = Math.max(0, state.poa.nextSettlement - Math.floor(Date.now() / 1000));
    const min = Math.floor(remaining / 60), sec = remaining % 60;
    process.stdout.write(`\r[STATUS] Epoch #${state.poa.epoch} | Next: ${min}m${sec}s | HB: ${state.station.heartbeatCount} | PoA: ${state.station.totalPoaRewards} | PoRx: ${state.station.totalPorxRewards}   `);
  });
  watchForReceptions((result) => console.log(`\n[PORX] Proof submission result:`, result));
  startMerger();
  startKeeper(30_000);
  startFlushing(2000);
  updateState("heartbeat", getHbStatus());
  flush();
  console.log("\n[READY] All systems running. Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    console.log("\n\n[SHUTDOWN] Stopping...");
    stopHeartbeatLoop();
    stopTracking();
    stopMerger();
    stopKeeper();
    stopFlushing();
    flush();
    console.log("[SHUTDOWN] Done.");
    process.exit(0);
  });
}
main().catch(err => { console.error("Fatal error:", err); process.exit(1); });
