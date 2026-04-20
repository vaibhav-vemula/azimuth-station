# Azimuth — End-to-End Setup & Deployment Guide

This guide takes you from a clean machine to a fully running two-station Azimuth network on Solana devnet.

**Station 1 — Mac** (`IS_PRIMARY=true`): heartbeats, proofs, keeper bot, image merger  
**Station 2 — Raspberry Pi** (`IS_PRIMARY=false`): heartbeats, proofs, keeper bot

---

## Prerequisites

Install these tools before starting:

```bash
# 1. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Solana CLI (Mac — use Homebrew if curl fails)
brew install solana
# or: sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# 3. Anchor (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.31.0
avm use 0.31.0

# 4. Node.js >= 18
node --version   # should print v18.x.x or later

# Verify everything
rustc --version        # rustc 1.x.x
solana --version       # solana-cli 1.18.x
anchor --version       # anchor-cli 0.31.0
node --version         # v18.x.x
```

---

## Step 1 — Admin Wallet

The admin wallet deploys the program and registers stations. Run on Mac:

```bash
# Create admin keypair (skip if you already have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Set network to devnet
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Check address and balance
solana address
solana balance

# Airdrop devnet SOL (needs ~3 SOL to deploy — repeat if rate-limited)
solana airdrop 2
solana airdrop 2
# If rate-limited, use https://faucet.solana.com with your address
```

---

## Step 2 — Build the Anchor Program

```bash
# From the project root
npm install
anchor build
# Expected: "Finished release [optimized] target(s)"
# Generates:
#   target/deploy/orbital_vault.so      ← compiled program binary
#   target/idl/orbital_vault.json       ← ABI used by all JS clients
#   target/types/orbital_vault.ts       ← TypeScript types
```

---

## Step 3 — Run Tests (Local Validator)

```bash
anchor test
```

Expected output:
```
orbital_vault
  ✔ initializes vault
  ✔ registers a station
  ✔ sends a heartbeat
  ✔ submits a PoRx proof

4 passing
```

If tests fail, do not proceed to deploy — fix the program first.

> `anchor test` temporarily uses localnet. After tests pass, `Anchor.toml` stays on `localnet` — the next step switches it back to devnet before deploying.

---

## Step 4 — Deploy to Devnet

Get the program address from the deploy keypair:

```bash
solana-keygen pubkey target/deploy/orbital_vault-keypair.json
# e.g. EjMuKKcM5YeEbfr2EQb1rYXViuJAgyCCJfjhHKeqake6
```

Set that address in two places:

**`Anchor.toml`:**
```toml
[programs.devnet]
orbital_vault = "YOUR_PROGRAM_ID_HERE"
```

**`programs/orbital_vault/src/lib.rs` line 10:**
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

Build and deploy once:
```bash
solana config set --url devnet
anchor build && anchor deploy
```

---

## Step 5 — Create AZM Token

AZM is the reward token distributed to stations for PoA heartbeats and PoRx proofs.

Edit `scripts/.env` with your values:
```
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/Users/vaibhav/.config/solana/devnet.json
ORBITAL_VAULT_PROGRAM_ID=EjMuKKcM5YeEbfr2EQb1rYXViuJAgyCCJfjhHKeqake6
```

Then run:
```bash
node scripts/createToken.js
```

Expected output:
```
Creating AZM SPL token...
AZM Mint: <mint pubkey>
Vault ATA: <vault ata pubkey>
Minted 1,000,000 AZM to vault
Saved to scripts/.token.json
```

This saves `scripts/.token.json` — keep it, the next step reads it.

---

## Step 6 — Initialize the Vault

```bash
node scripts/initializeVault.js
```

Expected output:
```
Vault initialized. Config PDA: <pda pubkey>
```

Vault parameters:
- **PoA epoch**: 10 minutes (demo — settles rewards every 10 min)
- **PoA reward**: 2 AZM per epoch per qualifying station
- **PoRx reward**: 1 AZM per received packet
- **Stake**: 0.5 SOL per station (in lamports, paid from station wallet)
- **Unstake cooldown**: 7 days
- **Heartbeat threshold**: 1 per epoch minimum

---

## Step 7 — Create Station Keypairs

Each station signs its own transactions and holds its own AZM rewards. Each also needs 0.5 SOL for staking plus extra for transaction fees — airdrop at least 1.5 SOL.

**On Mac (Station 1):**
```bash
solana-keygen new --outfile ~/.config/solana/station1.json
# Airdrop to station wallet
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station1.json)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station1.json)
solana balance $(solana-keygen pubkey ~/.config/solana/station1.json)
```

**On Raspberry Pi (Station 2):**
```bash
solana-keygen new --outfile ~/.config/solana/station2.json
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station2.json)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station2.json)
solana balance $(solana-keygen pubkey ~/.config/solana/station2.json)
```

---

## Step 8 — Register Each Station

Each machine registers itself. The script uses `ANCHOR_WALLET` as the station keypair and `STATION_LOCATION` as the display name.

**On Mac** — `scripts/.env` should have:
```
ANCHOR_WALLET=/Users/vaibhav/.config/solana/devnet.json   ← admin wallet
STATION_KEYPAIR_PATH=~/.config/solana/station1.json
STATION_LOCATION=Station 1 — Mac
```
Then run:
```bash
node scripts/registerStation.js
```

**On Raspberry Pi** — create `scripts/.env` on the Pi with:
```
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/devnet.json   ← same admin wallet (copy to Pi or use Pi admin)
ORBITAL_VAULT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
STATION_KEYPAIR_PATH=~/.config/solana/station2.json
STATION_LOCATION=Station 2 — Raspberry Pi
```
Then run:
```bash
node scripts/registerStation.js
```

Expected output (each machine):
```
Registered: Station 1 — Mac
  Pubkey: <station pubkey>
  PDA:    <station pda>
```

---

## Step 9 — Configure solana-client

**On Mac:**
```bash
cd solana-client
npm install
```

Create `solana-client/.env` on Mac:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
ORBITAL_VAULT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
OPERATOR_KEYPAIR_PATH=~/.config/solana/station1.json
AZM_MINT=<mint pubkey from scripts/.token.json>
HEARTBEAT_INTERVAL_MS=60000
SCHEDULE_POLL_INTERVAL_MS=30000
STATE_FILE=../ground_station/solana_state.json
IS_PRIMARY=true
IRYS_NODE=https://devnet.irys.xyz
```

**On Raspberry Pi:**
```bash
cd solana-client
npm install
```

Create `solana-client/.env` on Pi:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
ORBITAL_VAULT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
OPERATOR_KEYPAIR_PATH=~/.config/solana/station2.json
AZM_MINT=<mint pubkey from scripts/.token.json>
HEARTBEAT_INTERVAL_MS=60000
SCHEDULE_POLL_INTERVAL_MS=30000
STATE_FILE=../ground_station/solana_state.json
IS_PRIMARY=false
IRYS_NODE=https://devnet.irys.xyz
```

Start on each machine:
```bash
node index.js
```

You should see heartbeat confirmations every 60 seconds and the keeper bot polling every 30 seconds. After 10 minutes the keeper will automatically call `settlePoaEpoch()` and distribute AZM rewards.

---

## Step 10 — Configure Dashboards

### Station Dashboard (Mac)

```bash
cd dashboard
npm install @solana/web3.js @coral-xyz/anchor @solana/spl-token
npm install
```

Create `dashboard/.env.local`:
```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
NEXT_PUBLIC_AZM_MINT=<mint pubkey from scripts/.token.json>
```

```bash
npm run dev
# Open http://localhost:3000
# Paste a station pubkey into the address bar to view its stats
```

### Image Archive Dashboard (Mac)

```bash
cd image-dashboard
npm install
```

Create `image-dashboard/.env.local`:
```
NEXT_PUBLIC_IRYS_GRAPHQL=https://devnet.irys.xyz/graphql
NEXT_PUBLIC_IRYS_GATEWAY=https://devnet.irys.xyz
```

```bash
npm run dev -- -p 3001
# Open http://localhost:3001
```

---

## Step 11 — Run the Python Ground Station

Run on both Mac and Pi:

```bash
cd ground_station
pip install pygame pyserial pillow

# With LoRa USB receiver attached
python azimuth_station.py

# Specify USB port explicitly
python azimuth_station.py /dev/ttyACM0

# Headless mode (Pi without monitor)
python azimuth_station.py --no-ui
```

The Pygame UI shows live packet reception and image reconstruction. The right-side panel reads `solana_state.json` (written by `solana-client`) and shows live on-chain stats: heartbeat count, epoch progress, AZM balance.

Controls: `R` to reset, `ESC`/`Q` to quit.

---

## Step 12 — Flash Hardware

Flash firmware using Arduino IDE or PlatformIO:

| Firmware | Board | Role |
|---|---|---|
| `azimuth_transmitter/` | Heltec WiFi LoRa 32 V4 | Transmits JPEG as 104 LoRa packets at 915 MHz |
| `azimuth_receiver/` | Heltec WiFi LoRa 32 V4 | Bridges LoRa packets to USB serial |

Connect the receiver board to each Pi/Mac via USB. `azimuth_station.py` reads packets from that serial port.

---

## Verifying Everything Works

### Check program is deployed
```bash
solana program show YOUR_PROGRAM_ID_HERE
```

### Check vault and station accounts
```bash
# Vault config PDA (address printed by initializeVault.js)
solana account <vault_config_pda>

# Station PDAs (addresses printed by registerStation.js)
solana account <station1_pda>
solana account <station2_pda>
```

### Check station balances dropped by 0.5 SOL (stake deducted)
```bash
solana balance $(solana-keygen pubkey ~/.config/solana/station1.json)
solana balance $(solana-keygen pubkey ~/.config/solana/station2.json)
```

### Simulate a satellite pass (no hardware needed)
```bash
cat > ground_station/reception_event.json << 'EOF'
{
  "passId": "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd",
  "packets": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  "packetData": {},
  "totalPackets": 104,
  "timestamp": 1700000000
}
EOF
```

`proofSubmitter.js` detects this and submits a PoRx proof on-chain within seconds.

### Watch epoch settle
The keeper bot runs every 30 seconds. After 10 minutes it calls `settlePoaEpoch()` — you will see a log line like:
```
[KEEPER] PoA epoch due — settling epoch #1
[KEEPER] PoA epoch settled — TX: <signature>
```

Check the station dashboard at `http://localhost:3000` — AZM balance should increase.

---

## Common Errors

| Error | Fix |
|---|---|
| `Insufficient funds` | Airdrop more SOL — use https://faucet.solana.com if CLI is rate-limited |
| `Program not found` | Program ID in `Anchor.toml` / `lib.rs` doesn't match — re-check Step 4 |
| `Account not found` | Vault not initialized — run Step 6 |
| `scripts/.token.json not found` | Run Step 5 before Step 6 |
| `ANCHOR_WALLET not set` | Export the env vars shown in Step 5 |
| `Cannot find module '../target/types/orbital_vault'` | Run `anchor build` first |
| Station has insufficient funds on register | Station wallet needs > 0.5 SOL — re-do Step 7 airdrops |
| Heartbeat loop not confirming | Station not registered — re-check Step 8 |
| `scp` fails for Pi keypair | Check Pi IP, SSH is enabled (`sudo raspi-config`) |
