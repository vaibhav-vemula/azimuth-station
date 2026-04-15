use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    #[account(mut, seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = station.active @ AzimuthError::NotActive)]
    pub station: Account<'info, Station>,
    pub authority: Signer<'info>,
}
pub fn handler(ctx: Context<Heartbeat>) -> Result<()> {
    let clock = Clock::get()?;
    let s = &mut ctx.accounts.station;
    s.last_heartbeat = clock.unix_timestamp;
    s.heartbeat_count = s.heartbeat_count.checked_add(1).ok_or(AzimuthError::Overflow)?;
    emit!(crate::state::Heartbeat { station: ctx.accounts.authority.key(), timestamp: clock.unix_timestamp });
    Ok(())
}
