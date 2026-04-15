use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct CancelUnstake<'info> {
    #[account(mut, seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = !station.active @ AzimuthError::AlreadyActive,
        constraint = station.unstake_at > 0 @ AzimuthError::NoPendingUnstake)]
    pub station: Account<'info, Station>,
    pub authority: Signer<'info>,
}
pub fn handler(ctx: Context<CancelUnstake>) -> Result<()> {
    let s = &mut ctx.accounts.station;
    s.active = true; s.unstake_at = 0;
    Ok(())
}
