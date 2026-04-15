use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct SettlePoaEpoch<'info> {
    #[account(mut, seeds = [b"vault_config"], bump)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = vault_config)]
    pub vault_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

/// remaining_accounts layout: repeating pairs of [station_pda, station_ata]
/// The keeper bot builds this list from vault_config.station_list.
pub fn handler<'info>(ctx: Context<'_, '_, 'info, 'info, SettlePoaEpoch<'info>>) -> Result<()> {
    let clock = Clock::get()?;
    let cfg = &mut ctx.accounts.vault_config;
    require!(
        clock.unix_timestamp >= cfg.poa_epoch_start.checked_add(cfg.poa_epoch_interval).ok_or(AzimuthError::Overflow)?,
        AzimuthError::EpochNotReady
    );

    let bump = ctx.bumps.vault_config;
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault_config", &[bump]]];
    let mut rewarded: u64 = 0;
    let mut available: u64 = 0;

    for pair in ctx.remaining_accounts.chunks(2) {
        if pair.len() < 2 { break; }
        let station_info = &pair[0];
        let station_ata = &pair[1];

        let mut station = Account::<Station>::try_from(station_info)?;
        if !station.active || station.heartbeat_count < cfg.heartbeat_threshold {
            station.heartbeat_count = 0;
            station.exit(&crate::ID)?;
            continue;
        }

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault_ata.to_account_info(),
                    to: station_ata.to_account_info(),
                    authority: cfg.to_account_info(),
                },
                signer_seeds,
            ),
            cfg.poa_reward_amount,
        )?;

        station.total_poa_rewards = station.total_poa_rewards.checked_add(cfg.poa_reward_amount).ok_or(AzimuthError::Overflow)?;
        rewarded = rewarded.checked_add(cfg.poa_reward_amount).ok_or(AzimuthError::Overflow)?;
        station.heartbeat_count = 0;
        station.exit(&crate::ID)?;
        emit!(PoAReward { station: station_info.key(), epoch: cfg.poa_epoch_count + 1, amount: cfg.poa_reward_amount });
        available += 1;
    }

    cfg.poa_epoch_count += 1;
    cfg.poa_epoch_start = clock.unix_timestamp;

    emit!(PoAEpochSettled { epoch: cfg.poa_epoch_count, available_stations: available, total_rewarded: rewarded });
    Ok(())
}
