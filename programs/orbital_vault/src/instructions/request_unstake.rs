use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct RequestUnstake<'info> {
    #[account(seeds = [b"vault_config"], bump)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(mut, seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = station.active @ AzimuthError::NotActive)]
    pub station: Account<'info, Station>,
    pub authority: Signer<'info>,
}
pub fn handler(ctx: Context<RequestUnstake>) -> Result<()> {
    let clock = Clock::get()?;
    let s = &mut ctx.accounts.station;
    s.active = false;
    s.unstake_at = clock.unix_timestamp.checked_add(ctx.accounts.vault_config.unstake_cooldown).ok_or(AzimuthError::Overflow)?;
    Ok(())
}
