use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct ExecuteUnstake<'info> {
    #[account(mut, seeds = [b"vault_config"], bump)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(mut, seeds = [b"station", station_authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = !station.active @ AzimuthError::AlreadyActive,
        constraint = station.unstake_at > 0 @ AzimuthError::NoPendingUnstake)]
    pub station: Account<'info, Station>,
    #[account(mut)]
    pub station_authority: SystemAccount<'info>,
}

pub fn handler(ctx: Context<ExecuteUnstake>) -> Result<()> {
    let clock = Clock::get()?;
    require!(clock.unix_timestamp >= ctx.accounts.station.unstake_at, AzimuthError::CooldownNotElapsed);

    let amount = ctx.accounts.vault_config.stake_amount;
    if amount > 0 {
        **ctx.accounts.vault_config.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.station_authority.to_account_info().try_borrow_mut_lamports()? += amount;
    }

    let s = &mut ctx.accounts.station;
    s.registered = false;
    s.unstake_at = 0;
    Ok(())
}
