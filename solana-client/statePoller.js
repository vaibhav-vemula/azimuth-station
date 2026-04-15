const { program, keypair, vaultConfigPda, stationPda, programId } = require("./config");
const { PublicKey } = require("@solana/web3.js");

async function pollContractState() {
  try {
    const [cfg, stationInfo] = await Promise.all([
      program.account.vaultConfig.fetch(vaultConfigPda),
      program.account.station.fetch(stationPda),
    ]);

    const epochStart = cfg.poaEpochStart.toNumber();
    const interval = cfg.poaEpochInterval.toNumber();

    // Fetch this station's recent PoRx proofs
    const allProofs = await program.account.poRxProof.all([
      { memcmp: { offset: 8, bytes: keypair.publicKey.toBase58() } } // station field
    ]);

    const recentPasses = allProofs.map(({ account }) => ({
      passId: "0x" + Buffer.from(account.passId).toString("hex"),
      packetCount: account.packetCount,
      totalPackets: account.totalPackets,
      submittedAt: account.submittedAt.toNumber(),
      rewardAmount: account.rewardAmount.toNumber(),
      claimed: account.claimed,
      verified: account.verified,
      paid: account.paid,
    })).sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 10);

    return {
      poa: {
        epoch: cfg.poaEpochCount.toNumber(),
        epochStart,
        interval,
        nextSettlement: epochStart + interval,
      },
      station: {
        address: keypair.publicKey.toBase58(),
        registered: stationInfo.registered,
        active: stationInfo.active,
        location: stationInfo.location,
        lastHeartbeat: stationInfo.lastHeartbeat.toNumber(),
        heartbeatCount: stationInfo.heartbeatCount.toNumber(),
        totalPoaRewards: stationInfo.totalPoaRewards.toNumber(),
        totalPorxRewards: stationInfo.totalPorxRewards.toNumber(),
      },
      porx: {
        totalPasses: allProofs.length,
        recent: recentPasses,
        pending: recentPasses.filter(p => p.claimed && !p.paid),
        completed: recentPasses.filter(p => p.paid),
      },
      stationCount: cfg.stationList.length,
    };
  } catch (err) {
    console.error(`[POLLER] State poll failed: ${err.message}`);
    return null;
  }
}

let pollTimer = null;
function startTracking(interval, onUpdate) {
  console.log(`[POLLER] Starting — poll every ${interval / 1000}s`);
  const poll = async () => {
    const state = await pollContractState();
    if (state && onUpdate) onUpdate(state);
  };
  poll();
  pollTimer = setInterval(poll, interval);
}
function stopTracking() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

module.exports = { pollContractState, startTracking, stopTracking };
