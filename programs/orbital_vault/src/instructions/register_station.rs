use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(location: String)]
pub struct RegisterStation<'info> {
    #[account(mut, seeds = [b"vault_config"], bump, has_one = authority @ AzimuthError::NotAuthority)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(init, payer = authority, space = Station::LEN, seeds = [b"station", station.key().as_ref()], bump)]
    pub station_account: Account<'info, Station>,
    /// CHECK: station wallet — only pubkey stored
    pub station: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn handler(ctx: Context<RegisterStation>, location: String) -> Result<()> {
    require!(location.len() <= Station::MAX_LOCATION_LEN, AzimuthError::LocationTooLong);
    let cfg = &mut ctx.accounts.vault_config;
    require!(cfg.station_list.len() < VaultConfig::MAX_STATIONS, AzimuthError::StationListFull);
    require!(!ctx.accounts.station_account.registered, AzimuthError::AlreadyRegistered);
    let s = &mut ctx.accounts.station_account;
    s.authority = ctx.accounts.station.key();
    s.registered = true; s.active = true; s.location = location.clone();
    s.staked_at = Clock::get()?.unix_timestamp;
    s.last_heartbeat = 0; s.heartbeat_count = 0;
    s.total_poa_rewards = 0; s.total_porx_rewards = 0; s.unstake_at = 0;
    cfg.station_list.push(ctx.accounts.station.key());
    emit!(StationRegistered { station: ctx.accounts.station.key(), location });
    Ok(())
}
