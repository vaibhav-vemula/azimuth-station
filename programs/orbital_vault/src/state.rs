use anchor_lang::prelude::*;

#[account]
pub struct VaultConfig {
    pub authority: Pubkey,
    pub azm_mint: Pubkey,
    pub vault_ata: Pubkey,
    pub poa_epoch_count: u64,
    pub poa_epoch_start: i64,
    pub poa_epoch_interval: i64,
    pub poa_reward_amount: u64,
    pub porx_base_reward: u64,
    pub stake_amount: u64,        // lamports (0.5 SOL = 500_000_000)
    pub unstake_cooldown: i64,
    pub heartbeat_threshold: u64,
    pub station_list: Vec<Pubkey>,
}

impl VaultConfig {
    pub const MAX_STATIONS: usize = 200;
    pub const LEN: usize = 8      // discriminator
        + 32 + 32 + 32            // authority, azm_mint, vault_ata
        + 8 + 8 + 8               // epoch_count, epoch_start, epoch_interval
        + 8 + 8 + 8 + 8 + 8      // rewards, stake, cooldown, threshold
        + 4 + (32 * Self::MAX_STATIONS); // station_list vec
}

#[account]
pub struct Station {
    pub authority: Pubkey,
    pub registered: bool,
    pub active: bool,
    pub location: String,
    pub staked_at: i64,
    pub last_heartbeat: i64,
    pub heartbeat_count: u64,
    pub total_poa_rewards: u64,
    pub total_porx_rewards: u64,
    pub unstake_at: i64,
}

impl Station {
    pub const MAX_LOCATION_LEN: usize = 100;
    pub const LEN: usize = 8
        + 32               // authority
        + 1 + 1
        + 4 + Self::MAX_LOCATION_LEN
        + 8 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct PoRxProof {
    pub station: Pubkey,
    pub pass_id: [u8; 32],
    pub packet_count: u16,
    pub total_packets: u16,
    pub packet_merkle: [u8; 32],
    pub avg_rssi: i16,
    pub avg_snr: i16,
    pub submitted_at: i64,
    pub reward_amount: u64,
    pub claimed: bool,
    pub verified: bool,
    pub paid: bool,
}

impl PoRxProof {
    pub const LEN: usize = 8
        + 32 + 32
        + 2 + 2 + 32
        + 2 + 2 + 8 + 8
        + 1 + 1 + 1;
}

#[account]
pub struct ImageRecord {
    pub pass_id: [u8; 32],
    pub arweave_tx_id: String,
    pub recovered: u16,
    pub total: u16,
    pub submitter: Pubkey,
    pub recorded_at: i64,
}

impl ImageRecord {
    pub const MAX_ARWEAVE_TX_ID_LEN: usize = 64;
    pub const LEN: usize = 8
        + 32
        + 4 + Self::MAX_ARWEAVE_TX_ID_LEN
        + 2 + 2 + 32 + 8;
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct StationRegistered { pub station: Pubkey, pub location: String }

#[event]
pub struct Heartbeat { pub station: Pubkey, pub timestamp: i64 }

#[event]
pub struct PoAEpochSettled { pub epoch: u64, pub available_stations: u64, pub total_rewarded: u64 }

#[event]
pub struct PoAReward { pub station: Pubkey, pub epoch: u64, pub amount: u64 }

#[event]
pub struct PoRxSubmitted { pub station: Pubkey, pub pass_id: [u8; 32], pub packet_count: u16 }

#[event]
pub struct PoRxVerified { pub station: Pubkey, pub pass_id: [u8; 32], pub verifier: Pubkey }

#[event]
pub struct PoRxPaid { pub station: Pubkey, pub pass_id: [u8; 32], pub amount: u64 }

#[event]
pub struct ImageMerged { pub pass_id: [u8; 32], pub arweave_tx_id: String, pub submitter: Pubkey, pub recovered: u16, pub total: u16 }

#[event]
pub struct Slashed { pub station: Pubkey, pub amount: u64, pub reason: String }

