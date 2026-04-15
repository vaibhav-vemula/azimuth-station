/** Truncate an address: 0x1234...abcd */
export function truncateAddress(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Truncate a bytes32 hash */
export function truncateHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

/** Format a Unix timestamp to a locale string */
export function formatTimestamp(ts) {
  if (!ts || ts === 0n || ts === 0) return "Never";
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString();
}

/** Time ago from a Unix timestamp */
export function timeAgo(ts) {
  if (!ts || ts === 0n || ts === 0) return "Never";
  const now = Date.now() / 1000;
  const diff = now - Number(ts);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Format seconds into MM:SS or HH:MM:SS countdown */
export function formatCountdown(seconds) {
  if (seconds <= 0) return "Now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Format token amount (AZM has 0 decimals) */
export function formatAzm(amount, decimals = 0) {
  if (amount == null) return "—";
  const num = Number(amount) / 10 ** decimals;
  if (decimals === 0) return num.toLocaleString();
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Check if station is online based on last heartbeat vs epoch interval */
export function isStationOnline(lastHeartbeat, epochInterval) {
  if (!lastHeartbeat || lastHeartbeat === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  // Consider offline if no heartbeat in 1 epoch interval
  return now - Number(lastHeartbeat) < Number(epochInterval);
}

/** Determine PoRx proof status label */
export function porxStatus(proof) {
  if (!proof) return "Unknown";
  if (proof.paid) return "Paid";
  if (proof.verified) return "Verified";
  if (proof.claimed) return "Claimed";
  return "Submitted";
}

/** Status color class for PoRx */
export function porxStatusColor(status) {
  switch (status) {
    case "Paid":
      return "text-emerald-400";
    case "Verified":
      return "text-cyan-400";
    case "Claimed":
      return "text-amber-400";
    case "Submitted":
      return "text-slate-400";
    default:
      return "text-slate-500";
  }
}

/** Schedule status label */
export function scheduleStatusLabel(schedule) {
  if (!schedule) return "Unknown";
  if (schedule.executed) return "Executed";
  if (schedule.deleted) return "Deleted";
  if (schedule.expiry && schedule.expiry < new Date()) return "Expired";
  return "Pending";
}

/** Schedule status color */
export function scheduleStatusColor(label) {
  switch (label) {
    case "Executed":
      return "text-emerald-400 bg-emerald-400/10";
    case "Pending":
      return "text-amber-400 bg-amber-400/10";
    case "Expired":
    case "Deleted":
      return "text-red-400 bg-red-400/10";
    default:
      return "text-slate-400 bg-slate-400/10";
  }
}
