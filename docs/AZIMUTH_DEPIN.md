# AZIMUTH — Decentralized Satellite Ground Station Network

## Collaborative LoRa Image Reception as a DePIN

---

## 1. Vision

Azimuth is a **Decentralized Physical Infrastructure Network (DePIN)** of LoRa ground stations that collaboratively receive image transmissions from low-orbit satellites. No single ground station needs perfect reception — the network reconstructs complete images by merging packets across multiple independent nodes. Contributors earn **AZIMUTH tokens** proportional to their unique data contribution.

Traditional satellite ground stations are expensive, centralized, and have single points of failure. Azimuth decentralizes this by turning anyone with a Raspberry Pi and a $20 LoRa radio into a paid satellite data receiver.

---

## 2. How It Works

### 2.1 The Problem

A satellite transmits a JPEG image over LoRa as it passes overhead. Each image is split into numbered packets (e.g., 50 packets for a 12 KB image). Due to signal fading, interference, antenna orientation, and atmospheric conditions, **no single ground station receives 100% of packets**. One station might get 80%, another gets 70% — but they miss *different* packets.

### 2.2 The Solution — Collaborative Reception

```
                        ┌──────────────┐
                        │  SATELLITE   │
                        │  (ESP32 TX)  │
                        └──────┬───────┘
                               │ LoRa broadcast (915 MHz)
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ NODE A   │ │ NODE B   │ │ NODE C   │
              │ Primary  │ │ Primary  │ │ Backup   │
              │ 40/50 ✓  │ │ 38/50 ✓  │ │ 35/50 ✓  │
              └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │
                   ▼            ▼            ▼
              ┌─────────────────────────────────────┐
              │         MERGE ENGINE (Pi)           │
              │  Packets from A ∪ B ∪ C = 50/50 ✓  │
              └──────────────┬──────────────────────┘
                             │
                   ┌─────────┼─────────┐
                   ▼         ▼         ▼
              ┌────────┐ ┌───────┐ ┌────────────┐
              │  IPFS  │ │ HCS   │ │  REWARDS   │
              │ Image  │ │ Proof │ │  Tokens    │
              └────────┘ └───────┘ └────────────┘
```

Multiple ground stations in the same coverage area independently receive the satellite's LoRa transmission. Each station captures a different subset of packets depending on its signal quality, antenna, and local interference. A **merge engine** combines all received packets into one complete image. The result is published to IPFS and a cryptographic proof is submitted to Hedera.

### 2.3 Node Roles

| Role | Description | Assignment |
|------|-------------|------------|
| **Primary** | Top 2 stations by signal quality / reputation score. First to contribute packets to the merge. | Automatic, based on past performance and location |
| **Backup** | All other stations in the coverage area. Fill in packets that primaries missed. | Any registered station |

When a satellite approaches a coverage zone:
1. The network designates the **top 2 stations** as primary receivers based on historical RSSI, uptime, and packet success rate.
2. All other stations act as **backups** — they still receive and log packets, but their data is only used to fill gaps.
3. After the satellite pass, the merge engine assembles the composite image from all contributors.

---

## 3. Protocol Specification

### 3.1 Satellite Transmission Format

Each JPEG image is split into fixed-size packets and broadcast over LoRa:

```
┌─────────────────────────────────────────────┐
│              LoRa Packet (255 bytes max)     │
├──────────┬──────────────┬───────────────────┤
│ Byte 0-1 │  Byte 2-3    │  Byte 4-254       │
│ Packet ID│  Total Pkts  │  JPEG Payload     │
│ uint16 BE│  uint16 BE   │  up to 251 bytes  │
└──────────┴──────────────┴───────────────────┘
```

- **Packet ID**: 0-indexed sequence number (big-endian uint16)
- **Total Packets**: Total number of packets in this image (big-endian uint16)
- **JPEG Payload**: Raw JPEG bytes for this chunk (up to 251 bytes)

### 3.2 LoRa Parameters

| Parameter | Value |
|-----------|-------|
| Frequency | 915.125 MHz |
| Bandwidth | 125 kHz |
| Spreading Factor | 9 |
| Coding Rate | 4/5 |
| Sync Word | 0x12 |
| TX Power | 22 dBm |
| Preamble | 12 symbols |
| Max Payload | 255 bytes |

### 3.3 Receiver-to-Pi Bridge Protocol

Each Heltec receiver forwards packets to the Pi over USB serial using a binary frame:

```
┌──────┬──────┬──────────┬──────────┬──────────┬─────────────┐
│ 0xAA │ 0x55 │ LEN (2B) │ RSSI (2B)│ SNR (2B) │ Payload     │
│ sync │ sync │ uint16 BE│ int16 BE │ int16 BE │ LEN bytes   │
│      │      │          │ ×10      │ ×10      │             │
└──────┴──────┴──────────┴──────────┴──────────┴─────────────┘
```

- **RSSI**: Received signal strength × 10 (e.g., -1205 = -120.5 dBm)
- **SNR**: Signal-to-noise ratio × 10 (e.g., 75 = 7.5 dB)
- **Payload**: The raw LoRa packet (header + JPEG chunk)

---

## 4. Merge Engine

The merge engine is the core intelligence of Azimuth. It runs on the Pi (or a coordinator server) and combines packets from all nodes.

### 4.1 Algorithm

```
INPUT:  node_buffers = {node_id: {packet_id: (jpeg_data, rssi, timestamp)}}
OUTPUT: complete_image, contribution_map

1. Initialize merged = {}
2. For each packet_id from 0 to total_packets-1:
   a. If primary_A has packet_id:
        merged[packet_id] = primary_A[packet_id]
        credit → Node A
   b. Else if primary_B has packet_id:
        merged[packet_id] = primary_B[packet_id]
        credit → Node B
   c. Else for each backup node:
        if backup has packet_id:
            merged[packet_id] = backup[packet_id]
            credit → Backup node (with gap-filler bonus)
            break
   d. Else:
        merged[packet_id] = None  (missing from all nodes)

3. Assemble JPEG from merged packets in order
4. Return image + contribution_map
```

### 4.2 Contribution Scoring

| Contribution Type | Score Multiplier | Rationale |
|-------------------|-----------------|-----------|
| Primary packet (also held by others) | 1.0x | Standard contribution |
| Unique packet (only this node had it) | 1.5x | Critical — without this node, data is lost |
| Gap-filler (backup fills primary's gap) | 2.0x | Saved the image from being incomplete |
| Redundant (packet already merged) | 0.0x | No reward for duplicates |

### 4.3 Image Completeness Rating

```
Completeness = (merged_packets / total_packets) × 100%

Rating:
  100%       → PERFECT    — Full image reconstructed
  95-99%     → EXCELLENT  — Minor artifacts, usable
  80-94%     → PARTIAL    — Visible gaps, still valuable
  < 80%      → DEGRADED   — Significant data loss
```

---

## 5. Hedera Integration

### 5.1 Why Hedera

| Feature | Benefit for Azimuth |
|---------|-------------------|
| Hedera Consensus Service (HCS) | Immutable, timestamped log of all reception proofs. Perfect for IoT data. |
| Hedera Token Service (HTS) | Create AZIMUTH token without writing a token contract. |
| Low fees (~$0.001/tx) | Affordable for high-frequency IoT data submissions. |
| Fast finality (~3-5s) | Near real-time proof publication. |
| Hedera Smart Contract Service | Solidity contracts for registry, rewards, governance. |
| Mirror Node REST API | Free queries for dashboard and analytics. |

### 5.2 AZIMUTH Token (HTS)

```
Token Name:     AZIMUTH
Symbol:         AZM
Type:           Fungible (HTS)
Decimals:       8
Total Supply:   1,000,000,000 AZM
Distribution:
  - 40% — Node rewards pool (released over 10 years)
  - 20% — Development fund
  - 15% — Community / airdrops
  - 15% — Founding team (3-year vest)
  - 10% — Liquidity / partnerships
```

### 5.3 On-Chain Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HEDERA NETWORK                           │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ HTS         │  │ HCS          │  │ Smart Contracts   │  │
│  │             │  │              │  │                   │  │
│  │ AZM Token   │  │ Topic:       │  │ StationRegistry   │  │
│  │ mint/       │  │ reception    │  │ RewardDistributor │  │
│  │ transfer    │  │ proofs       │  │ DataMarketplace   │  │
│  │             │  │              │  │                   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Step-by-step:

1. **Station Registration**
   - Operator calls `StationRegistry.register(location, hardware, stake)`
   - Stakes minimum AZM tokens to activate
   - Gets assigned a `station_id` on-chain

2. **Satellite Pass — Reception Phase**
   - Each node receives LoRa packets independently
   - Node logs packets locally: `{packet_id, data_hash, rssi, snr, timestamp}`

3. **Submission Phase**
   - Each node submits reception proof to HCS topic:
   ```json
   {
     "type": "reception_proof",
     "station_id": "0.0.12345",
     "satellite_id": "AZ-SAT-001",
     "pass_id": "2026-02-14T08:30:00Z",
     "packets_received": [0, 1, 2, 3, 5, 7, 8, 9, 10],
     "packets_total": 12,
     "packet_hashes": ["sha256:abc...", "sha256:def..."],
     "avg_rssi": -95.3,
     "avg_snr": 7.2
   }
   ```

4. **Merge & Publish**
   - Coordinator merges packets from all nodes
   - Complete image uploaded to IPFS → gets CID
   - Merge proof submitted to HCS:
   ```json
   {
     "type": "merge_result",
     "pass_id": "2026-02-14T08:30:00Z",
     "image_cid": "QmXyz...",
     "image_hash": "sha256:final...",
     "completeness": 100.0,
     "contributors": {
       "0.0.12345": {"packets": 9, "unique": 2, "score": 11.0},
       "0.0.12346": {"packets": 8, "unique": 3, "score": 13.0}
     }
   }
   ```

5. **Reward Distribution**
   - `RewardDistributor` contract reads merge results from HCS (via mirror node)
   - Calculates token rewards per contributor based on score
   - Transfers AZM tokens to each node's wallet

---

## 6. System Architecture

### 6.1 Hardware

```
┌─────────────────────────────────────────────────────────────┐
│                    GROUND STATION NODE                       │
│                                                             │
│  ┌──────────────────┐    USB-C    ┌────────────────────┐   │
│  │ Heltec WiFi LoRa │ ──────────► │   Raspberry Pi 5   │   │
│  │ 32 V4 (Receiver) │            │                    │   │
│  │ ESP32-S3 + SX1262│            │ - Merge Engine     │   │
│  │ 915 MHz antenna  │            │ - Sci-fi Dashboard │   │
│  └──────────────────┘            │ - Hedera SDK       │   │
│                                   │ - IPFS Client      │   │
│  ┌──────────────────┐    USB-C    │                    │   │
│  │ Heltec WiFi LoRa │ ──────────► │                    │   │
│  │ 32 V4 (Receiver) │            │                    │   │
│  │ (2nd node/backup)│            └────────────────────┘   │
│  └──────────────────┘                                      │
│                                                             │
│  ┌──────────────────┐                                      │
│  │ Heltec WiFi LoRa │  ← Satellite simulator (separate)   │
│  │ 32 V4 (TX)       │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Software Stack

| Component | Technology | Description |
|-----------|-----------|-------------|
| Satellite TX | Arduino / heltec_unofficial | Transmits JPEG packets over LoRa |
| Receiver Bridge | Arduino / heltec_unofficial | Receives LoRa, forwards to Pi via USB serial |
| Merge Engine | Python (Raspberry Pi) | Merges packets from multiple receivers |
| Dashboard | Python / Pygame | Sci-fi real-time display with dual-node view |
| Hedera Client | Python / Hedera SDK | Submits proofs, manages tokens |
| IPFS Client | Python / IPFS HTTP API | Uploads completed images |
| Image Converter | Python / PIL | Converts JPEG to transmittable format |
| Web Dashboard | Next.js / React | Network-wide map and stats |

### 6.3 Data Flow

```
1. TRANSMIT
   ESP32 TX → LoRa broadcast → 915.125 MHz

2. RECEIVE
   Heltec RX-A → USB → Pi (Node A buffer)
   Heltec RX-B → USB → Pi (Node B buffer)

3. MERGE
   Pi: merged_image = merge(node_a_packets, node_b_packets)
   Pi: contribution_map = who_contributed_what()

4. STORE
   Pi → IPFS: upload merged image → get CID

5. PROVE
   Pi → Hedera HCS: submit reception proofs + merge result

6. REWARD
   Hedera Smart Contract: distribute AZM tokens to contributors

7. DISPLAY
   Pi Dashboard: show merged image, per-node stats, contribution split
   Web Dashboard: show all stations worldwide, coverage map
```

---

## 7. Dashboard Design

### 7.1 Sci-Fi Ground Station Display (Pygame on Pi)

```
┌─────────────────────────────────────────────────────────────────┐
│  AZIMUTH GROUND STATION                                        │
│  SX1262 // 915 MHz // LoRa // DePIN                           │
├────────────────────────┬────────────────────────────────────────┤
│ [ TELEMETRY ]          │                                        │
│                        │         ┌──────────────────────┐       │
│ STATUS    RECEIVING    │         │                      │       │
│ PROGRESS  75.0%        │         │    LIVE PREVIEW      │       │
│                        │         │    (merged image)    │       │
│ [ NODE A — PRIMARY ]   │         │                      │       │
│ RSSI    -95.2 dBm      │         │  ████████████████    │       │
│ SNR       7.1 dB       │         │  ████████████████    │       │
│ PKTS    10 / 12        │         │  ████████████████    │       │
│ UNIQUE    2            │         │  ░░░░ NO DATA ░░░░   │       │
│ ██████████░░ (83%)     │         │                      │       │
│                        │         └──────────────────────┘       │
│ [ NODE B — BACKUP ]    │                                        │
│ RSSI    -102.5 dBm     │  [ MERGE MAP ]                        │
│ SNR       4.3 dB       │  ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■            │
│ PKTS     8 / 12        │  ██= Node A  ██= Node B  ░░= Missing │
│ GAP-FILL  3            │                                        │
│ ████████░░░░ (67%)     │  [ HEDERA ]                           │
│                        │  HCS Topic: 0.0.98765                 │
│ [ MERGED ]             │  Last TX: 0x3fa8...2c1b               │
│ TOTAL   12 / 12 (100%) │  AZM Earned: +24.5 AZM               │
│ ██████████████ PERFECT │                                        │
├────────────────────────┴────────────────────────────────────────┤
│ UTC 2026-02-14 08:30:45    [R] RESET  [ESC] QUIT   AZIMUTH v3 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Merge Map Color Coding

| Color | Meaning |
|-------|---------|
| Bright Green | Packet from Node A (primary) |
| Cyan | Packet filled by Node B (backup / gap-filler) |
| Dark / Noise | Missing from all nodes |
| Amber | Packet received by both (credit to primary) |

---

## 8. Smart Contracts (Hedera EVM — Solidity)

### 8.1 StationRegistry.sol

```
Functions:
  register(string location, string hardware) → stakes AZM, gets station_id
  deregister() → unstake AZM after cooldown
  updateLocation(string location)
  getStation(address) → station details
  getActiveStations() → list of all active stations
  slash(address, reason) → penalize malicious/offline stations
```

### 8.2 RewardDistributor.sol

```
Functions:
  submitMergeResult(passId, contributors[], scores[], imageCID)
  claimRewards(passId) → transfers earned AZM to caller
  getRewardsBalance(address) → pending rewards
  setRewardRate(uint256 tokensPerEpoch) → governance only
```

### 8.3 DataMarketplace.sol

```
Functions:
  listImage(imageCID, price, metadata) → list for sale
  purchaseImage(imageCID) → pay AZM, get access
  getListings() → browse available satellite images
  tipContributor(address, amount) → direct tip to a station operator
```

---

## 9. Tokenomics

### 9.1 Earning AZM

| Activity | Reward |
|----------|--------|
| Receive a packet (standard) | 1.0 AZM |
| Receive a unique packet (only you got it) | 1.5 AZM |
| Fill a gap (backup saves the image) | 2.0 AZM |
| Achieve 100% merge as primary | 5.0 AZM bonus |
| Weekly uptime > 95% | 10.0 AZM bonus |
| Image sold on marketplace | 30% of sale price |

### 9.2 Spending AZM

| Activity | Cost |
|----------|------|
| Register a station (stake) | 100 AZM |
| Purchase satellite image | Variable (set by seller) |
| Boost station priority | 50 AZM / epoch |
| Governance vote | 1 AZM = 1 vote |

### 9.3 Slashing

| Offense | Penalty |
|---------|---------|
| Submitting false proofs | -50% stake |
| Extended downtime (>7 days) | -10% stake |
| Malicious data injection | Full stake slash + ban |

---

## 10. Demo Implementation Plan

### Phase 1 — Hardware (Current)
- [x] ESP32 transmitter (Heltec #1) — sends JPEG over LoRa
- [x] ESP32 receiver bridge (Heltec #2) — receives LoRa, forwards to Pi
- [ ] Buy Heltec #3 — second receiver node
- [x] Raspberry Pi 5 with USB connections
- [x] Sci-fi Pygame dashboard

### Phase 2 — Dual-Node Reception
- [ ] Flash Heltec #3 with receiver firmware (same as #2)
- [ ] Update azimuth_station.py to read from 2 USB serial ports
- [ ] Implement merge engine (combine packets from both nodes)
- [ ] Update dashboard: dual-node stats + color-coded merge map
- [ ] Show per-node contribution breakdown

### Phase 3 — Hedera Integration
- [ ] Create AZIMUTH (AZM) token on Hedera Testnet via HTS
- [ ] Create HCS topic for reception proofs
- [ ] Pi submits reception proofs to HCS after each satellite pass
- [ ] Pi submits merge results to HCS
- [ ] Display Hedera TX hash on dashboard

### Phase 4 — IPFS + Data Storage
- [ ] Install IPFS on Pi (or use Pinata/web3.storage API)
- [ ] Upload merged images to IPFS after completion
- [ ] Log IPFS CID to HCS alongside merge proof

### Phase 5 — Smart Contracts
- [ ] Deploy StationRegistry on Hedera Testnet
- [ ] Deploy RewardDistributor on Hedera Testnet
- [ ] Pi registers as a station on-chain
- [ ] Rewards calculated and distributed after each pass

### Phase 6 — Web Dashboard
- [ ] Next.js web app showing network map
- [ ] Query Hedera Mirror Node for station data and proofs
- [ ] Display live station locations, stats, and recent images
- [ ] Leaderboard of top-contributing stations

### Phase 7 — Mainnet Launch
- [ ] Security audit of smart contracts
- [ ] Migrate from Testnet to Mainnet
- [ ] Launch token distribution
- [ ] Onboard first external node operators

---

## 11. File Structure

```
azimuth/
├── azimuth_transmitter/          # ESP32 satellite simulator
│   ├── azimuth_transmitter.ino
│   └── image_data.h
├── azimuth_receiver/             # ESP32 LoRa-to-USB bridge
│   └── azimuth_receiver.ino
├── azimuth_station.py            # Pi: dashboard + merge engine
├── convert_image.py              # JPEG → C header converter
├── hedera/                       # Hedera integration
│   ├── create_token.py           # Deploy AZM token (HTS)
│   ├── create_topic.py           # Create HCS topic
│   ├── submit_proof.py           # Submit reception proof to HCS
│   └── contracts/
│       ├── StationRegistry.sol
│       ├── RewardDistributor.sol
│       └── DataMarketplace.sol
├── web-dashboard/                # Network-wide web UI
│   └── (Next.js app)
├── AZIMUTH_DEPIN.md              # This document
├── SETUP_GUIDE.md                # Hardware setup
└── TRANSMITTER_GUIDE.md          # ESP32 setup
```

---

## 12. Key Differentiators

| vs. Existing DePIN | Azimuth Advantage |
|---------------------|-------------------|
| Helium (coverage proof) | Azimuth proves *actual data reception*, not just RF coverage |
| Filecoin (storage) | Azimuth captures data at the physical layer, not just stores it |
| Traditional ground stations | 100x cheaper, permissionless, collaborative redundancy |
| Single-station setups | No single point of failure — network fills gaps automatically |

---

## 13. Future Roadmap

- **Real satellite integration** — Receive actual CubeSat LoRa transmissions (TinyGS compatible)
- **Mobile nodes** — Android/iOS app turning phones into receiver nodes via BLE LoRa adapters
- **Multi-frequency** — Support 433 MHz, 868 MHz, 915 MHz bands
- **AI image enhancement** — Use ML to reconstruct missing image regions when packets are permanently lost
- **Cross-region mesh** — Stations relay data to each other when satellite is between coverage zones
- **DAO governance** — Token holders vote on network parameters, reward rates, and protocol upgrades

---

*Built with Heltec WiFi LoRa 32 V4, Raspberry Pi 5, Hedera Hashgraph, and a passion for decentralized space infrastructure.*
