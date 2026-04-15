const { program, stationPda, keypair, HEARTBEAT_INTERVAL } = require("./config");
const { acquireLock, releaseLock } = require("./proofSubmitter");

let heartbeatCount = 0;
let lastTxSig = null;
let timer = null;

async function sendHeartbeat() {
  try {
    await acquireLock();
    console.log(`[HEARTBEAT] Sending heartbeat #${heartbeatCount + 1}...`);
    const sig = await program.methods.heartbeat()
      .accounts({ station: stationPda, authority: keypair.publicKey })
      .rpc();
    heartbeatCount++;
    lastTxSig = sig;
    console.log(`[HEARTBEAT] #${heartbeatCount} confirmed — TX: ${sig}`);
    return { success: true, txSig: sig, count: heartbeatCount };
  } catch (err) {
    console.error(`[HEARTBEAT] Failed: ${err.message}`);
    return { success: false, error: err.message, count: heartbeatCount };
  } finally {
    releaseLock();
  }
}

function startHeartbeatLoop() {
  console.log(`[HEARTBEAT] Starting loop — interval: ${HEARTBEAT_INTERVAL / 1000}s`);
  sendHeartbeat();
  timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}
function stopHeartbeatLoop() { if (timer) { clearInterval(timer); timer = null; } }
function getStatus() { return { count: heartbeatCount, lastTxSig, intervalMs: HEARTBEAT_INTERVAL }; }

module.exports = { sendHeartbeat, startHeartbeatLoop, stopHeartbeatLoop, getStatus };
