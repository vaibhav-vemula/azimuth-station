use anchor_lang::prelude::*;
use crate::state::VaultConfig;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, seeds = [b"vault_config"], bump, has_one = authority @ AzimuthError::NotAuthority)]
    pub vault_config: Account<'info, VaultConfig>,
    pub authority: Signer<'info>,
}
pub fn set_poa_epoch_interval(ctx: Context<AdminOnly>, interval: i64) -> Result<()> {
    ctx.accounts.vault_config.poa_epoch_interval = interval; Ok(())
}
pub fn set_reward_rates(ctx: Context<AdminOnly>, poa_reward: u64, porx_base: u64) -> Result<()> {
    ctx.accounts.vault_config.poa_reward_amount = poa_reward;
    ctx.accounts.vault_config.porx_base_reward = porx_base; Ok(())
}
pub fn set_heartbeat_threshold(ctx: Context<AdminOnly>, threshold: u64) -> Result<()> {
    ctx.accounts.vault_config.heartbeat_threshold = threshold; Ok(())
}
