const fs = require("fs");
const { STATE_FILE } = require("./config");

let currentState = { station: null, poa: null, porx: null, heartbeat: null, lastUpdated: null };

function updateState(section, data) {
  currentState[section] = data;
  currentState.lastUpdated = new Date().toISOString();
}
function flush() {
  const tmp = STATE_FILE + ".tmp";
  try {
    fs.writeFileSync(tmp, JSON.stringify(currentState, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch (err) {
    console.error(`[STATE] Write failed: ${err.message}`);
  }
}
let flushTimer = null;
function startFlushing(intervalMs = 2000) { flushTimer = setInterval(flush, intervalMs); }
function stopFlushing() { if (flushTimer) { clearInterval(flushTimer); flushTimer = null; } }
function getState() { return currentState; }

module.exports = { updateState, flush, startFlushing, stopFlushing, getState };
