"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { fetchVaultConfig, fetchStationInfo, fetchPoRxProofs, fetchAzmBalance } from "./program";

const POLL_INTERVAL = 10_000;

export function useStationData(stationAddress) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!stationAddress) { setData(null); setError(null); return; }
    try { new PublicKey(stationAddress); } catch { setError("Invalid Solana address"); return; }

    try {
      const [cfg, stationInfo, proofs, azmBalance] = await Promise.all([
        fetchVaultConfig(),
        fetchStationInfo(stationAddress),
        fetchPoRxProofs(stationAddress),
        fetchAzmBalance(stationAddress),
      ]);

      const epochStart = cfg.poaEpochStart.toNumber();
      const interval = cfg.poaEpochInterval.toNumber();

      const recentPasses = proofs
        .map(({ account }) => ({
          passId: "0x" + Buffer.from(account.passId).toString("hex"),
          packetCount: account.packetCount,
          totalPackets: account.totalPackets,
          avgRssi: account.avgRssi,
          avgSnr: account.avgSnr,
          timestamp: account.submittedAt.toNumber(),
          reward: account.rewardAmount.toNumber(),
          claimed: account.claimed,
          verified: account.verified,
          paid: account.paid,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      setData({
        station: {
          registered: stationInfo.registered,
          active: stationInfo.active,
          location: stationInfo.location,
          lastHeartbeat: stationInfo.lastHeartbeat.toNumber(),
          heartbeatCount: stationInfo.heartbeatCount.toNumber(),
          totalPoaRewards: stationInfo.totalPoaRewards.toNumber(),
          totalPorxRewards: stationInfo.totalPorxRewards.toNumber(),
        },
        epochCount: cfg.poaEpochCount.toNumber(),
        epochStart,
        epochInterval: interval,
        nextSettlement: epochStart + interval,
        heartbeatThreshold: cfg.heartbeatThreshold.toNumber(),
        poaRewardAmount: cfg.poaRewardAmount.toNumber(),
        porxBaseReward: cfg.porxBaseReward.toNumber(),
        porxPassCount: proofs.length,
        porxPasses: recentPasses,
        azmBalance,
        stationCount: cfg.stationList.length,
      });
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch data");
    }
  }, [stationAddress]);

  useEffect(() => {
    if (!stationAddress) { setData(null); setLoading(false); setError(null); return; }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stationAddress, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
