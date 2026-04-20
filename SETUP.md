# Azimuth — End-to-End Setup & Deployment Guide

This guide takes you from a clean machine to a fully running two-station Azimuth network on Solana devnet.

**Station 1 — Mac** (`IS_PRIMARY=true`): heartbeats, proofs, keeper bot, image merger  
**Station 2 — Raspberry Pi** (`IS_PRIMARY=false`): heartbeats, proofs, keeper bot

---

## Prerequisites

### Mac (Station 1 — build machine)

```bash
# 1. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Solana CLI
brew install solana
# or: sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# 3. Anchor (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.31.0
avm use 0.31.0

# 4. Node.js >= 18
node --version   # should print v18.x.x or later

# Verify
rustc --version        # rustc 1.x.x
solana --version       # solana-cli 1.18.x
anchor --version       # anchor-cli 0.31.0
node --version         # v18.x.x
```

### Raspberry Pi (Station 2 — ARM64)

The Pi only runs `solana-client` (Node.js). No Solana CLI, Rust, or Anchor needed —
Agave v3.x has no Linux aarch64 binary. All keypair and registration steps run on Mac.

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Node.js 18 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version         # v18.x.x

# 3. Clone the repo
git clone https://github.com/YOUR_REPO/azimuth-solana.git
cd azimuth-solana/solana-client
npm install
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

Build and deploy:
```bash
solana config set --url devnet
anchor build && anchor deploy
```

---

## Step 5 — Create AZM Token

AZM is the reward token distributed to stations for PoA heartbeats and PoRx proofs.

Edit `scripts/.env`:
```
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
ORBITAL_VAULT_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
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

Add the printed mint address to `scripts/.env`:
```
AZM_MINT=<mint pubkey>
```

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
- **Stake**: 0.5 SOL per station (paid from station wallet on registration)
- **Unstake cooldown**: 7 days
- **Heartbeat threshold**: 1 per epoch minimum

---

## Step 7 — Create Station Keypairs (on Mac)

Both keypairs are generated on Mac. The Pi has no Solana CLI.
Each station needs 0.5 SOL for staking plus fees — airdrop at least 1.5 SOL each.

```bash
# Station 1 (Mac)
solana-keygen new --outfile ~/.config/solana/station1.json
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station1.json)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station1.json)
solana balance $(solana-keygen pubkey ~/.config/solana/station1.json)

# Station 2 (Pi — generated on Mac)
solana-keygen new --outfile ~/.config/solana/station2.json
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station2.json)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/station2.json)
solana balance $(solana-keygen pubkey ~/.config/solana/station2.json)

# Copy Station 2 keypair to Pi — cat on Mac, then run the printed command on Pi
cat ~/.config/solana/station2.json
# On Pi:
mkdir -p ~/.config/solana
cat > ~/.config/solana/station2.json << 'EOF'
[37,235,100,100,213,70,216,23,240,75,197,238,214,202,77,78,116,81,182,123,59,243,72,103,3,96,63,165,163,62,249,159,95,67,60,120,17,49,187,35,31,103,35,56,128,174,133,77,30,6,33,136,138,148,127,197,204,237,63,140,39,195,134,179]
EOF
```

---

## Step 8 — Register Both Stations (on Mac)

Both registrations run from the Mac in one command — the script needs
`target/idl/orbital_vault.json` which only exists after `anchor build` on Mac.

Add both keypair paths to `scripts/.env`:
```
STATION1_KEYPAIR_PATH=~/.config/solana/station1.json
STATION1_LOCATION=Station 1 — Mac
STATION2_KEYPAIR_PATH=~/.config/solana/station2.json
STATION2_LOCATION=Station 2 — Raspberry Pi
```

```bash
node scripts/registerStation.js
```

Expected output:
```
Registered: Station 1 — Mac
  Pubkey: <station1 pubkey>
  PDA:    <station1 pda>
Registered: Station 2 — Raspberry Pi
  Pubkey: <station2 pubkey>
  PDA:    <station2 pda>
```

---

## Step 9 — Configure solana-client

The Pi needs the compiled IDL file (not committed to git). Copy it by pasting:

On Mac, print the IDL:
```bash
cat target/idl/orbital_vault.json
```

On Pi, paste the output:
```bash
mkdir -p ~/azimuth-solana/target/idl
cat > ~/azimuth-solana/target/idl/orbital_vault.json << 'EOF'
<paste contents here>
EOF
```

**On Mac** — create `solana-client/.env`:
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

```bash
cd solana-client && npm install
node index.js
```

**On Raspberry Pi** — create `solana-client/.env`:
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

```bash
node index.js
```

You should see heartbeat confirmations every 60 seconds and the keeper bot polling every 30 seconds. After 10 minutes the keeper will automatically call `settlePoaEpoch()` and distribute AZM rewards.

---

## Step 10 — Configure Dashboards

### Station Dashboard (Mac)

```bash
cd dashboard
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
| `ANCHOR_WALLET not set` | Check `scripts/.env` has `ANCHOR_WALLET` set |
| `Cannot find module '../target/idl/orbital_vault'` | Run `anchor build` on Mac; scp IDL to Pi (Step 9) |
| Station has insufficient funds on register | Station wallet needs > 0.5 SOL — re-do Step 7 airdrops |
| Heartbeat loop not confirming | Station not registered — re-check Step 8 |
| `scp` fails | Check Pi IP, SSH is enabled (`sudo raspi-config → Interface Options → SSH`) |
