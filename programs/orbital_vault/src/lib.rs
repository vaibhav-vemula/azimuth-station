#![allow(deprecated)]
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("EjMuKKcM5YeEbfr2EQb1rYXViuJAgyCCJfjhHKeqake6");

#[program]
pub mod orbital_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, poa_epoch_interval: i64, poa_reward_amount: u64, porx_base_reward: u64, stake_amount: u64, unstake_cooldown: i64, heartbeat_threshold: u64) -> Result<()> {
        instructions::initialize::handler(ctx, poa_epoch_interval, poa_reward_amount, porx_base_reward, stake_amount, unstake_cooldown, heartbeat_threshold)
    }
    pub fn register_station(ctx: Context<RegisterStation>, location: String) -> Result<()> {
        instructions::register_station::handler(ctx, location)
    }
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        instructions::heartbeat::handler(ctx)
    }
    pub fn settle_poa_epoch<'info>(ctx: Context<'_, '_, 'info, 'info, SettlePoaEpoch<'info>>) -> Result<()> {
        instructions::settle_poa_epoch::handler(ctx)
    }
    pub fn submit_porx(ctx: Context<SubmitPorx>, pass_id: [u8; 32], packet_count: u16, total_packets: u16, packet_merkle: [u8; 32], avg_rssi: i16, avg_snr: i16) -> Result<()> {
        instructions::submit_porx::handler(ctx, pass_id, packet_count, total_packets, packet_merkle, avg_rssi, avg_snr)
    }
    pub fn claim_porx_reward(ctx: Context<ClaimPorxReward>, pass_id: [u8; 32]) -> Result<()> {
        instructions::claim_porx_reward::handler(ctx, pass_id)
    }
    pub fn verify_porx(ctx: Context<VerifyPorx>, pass_id: [u8; 32]) -> Result<()> {
        instructions::verify_porx::handler(ctx, pass_id)
    }
    pub fn execute_porx_payout(ctx: Context<ExecutePorxPayout>, pass_id: [u8; 32]) -> Result<()> {
        instructions::execute_porx_payout::handler(ctx, pass_id)
    }
    pub fn request_unstake(ctx: Context<RequestUnstake>) -> Result<()> {
        instructions::request_unstake::handler(ctx)
    }
    pub fn cancel_unstake(ctx: Context<CancelUnstake>) -> Result<()> {
        instructions::cancel_unstake::handler(ctx)
    }
    pub fn execute_unstake(ctx: Context<ExecuteUnstake>) -> Result<()> {
        instructions::execute_unstake::handler(ctx)
    }
    pub fn slash(ctx: Context<Slash>, reason: String) -> Result<()> {
        instructions::slash::handler(ctx, reason)
    }
    pub fn record_image(ctx: Context<RecordImage>, pass_id: [u8; 32], arweave_tx_id: String, recovered: u16, total: u16) -> Result<()> {
        instructions::record_image::handler(ctx, pass_id, arweave_tx_id, recovered, total)
    }
    pub fn set_poa_epoch_interval(ctx: Context<AdminOnly>, interval: i64) -> Result<()> {
        instructions::admin::set_poa_epoch_interval(ctx, interval)
    }
    pub fn set_reward_rates(ctx: Context<AdminOnly>, poa_reward: u64, porx_base: u64) -> Result<()> {
        instructions::admin::set_reward_rates(ctx, poa_reward, porx_base)
    }
    pub fn set_heartbeat_threshold(ctx: Context<AdminOnly>, threshold: u64) -> Result<()> {
        instructions::admin::set_heartbeat_threshold(ctx, threshold)
    }
}
