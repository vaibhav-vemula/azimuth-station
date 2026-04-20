use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(location: String)]
pub struct RegisterStation<'info> {
    #[account(mut, seeds = [b"vault_config"], bump, has_one = authority @ AzimuthError::NotAuthority)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(init, payer = authority, space = Station::LEN, seeds = [b"station", station.key().as_ref()], bump)]
    pub station_account: Account<'info, Station>,
    #[account(mut)]
    pub station: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn handler(ctx: Context<RegisterStation>, location: String) -> Result<()> {
    require!(location.len() <= Station::MAX_LOCATION_LEN, AzimuthError::LocationTooLong);
    require!(ctx.accounts.vault_config.station_list.len() < VaultConfig::MAX_STATIONS, AzimuthError::StationListFull);
    require!(!ctx.accounts.station_account.registered, AzimuthError::AlreadyRegistered);

    // Station wallet pays the stake
    let stake = ctx.accounts.vault_config.stake_amount;
    if stake > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.station.to_account_info(),
                    to: ctx.accounts.vault_config.to_account_info(),
                },
            ),
            stake,
        )?;
    }

    let now = Clock::get()?.unix_timestamp;
    let station_key = ctx.accounts.station.key();
    let s = &mut ctx.accounts.station_account;
    s.authority = station_key;
    s.registered = true; s.active = true; s.location = location.clone();
    s.staked_at = now; s.last_heartbeat = 0; s.heartbeat_count = 0;
    s.total_poa_rewards = 0; s.total_porx_rewards = 0; s.unstake_at = 0;
    ctx.accounts.vault_config.station_list.push(station_key);
    emit!(StationRegistered { station: station_key, location });
    Ok(())
}
