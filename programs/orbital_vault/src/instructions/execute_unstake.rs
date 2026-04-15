use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
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
    /// CHECK: station wallet pubkey
    pub station_authority: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = vault_config)]
    pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = station_authority)]
    pub station_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
pub fn handler(ctx: Context<ExecuteUnstake>) -> Result<()> {
    let clock = Clock::get()?;
    let s = &ctx.accounts.station;
    require!(clock.unix_timestamp >= s.unstake_at, AzimuthError::CooldownNotElapsed);
    let amount = ctx.accounts.vault_config.stake_amount;
    let bump = ctx.bumps.vault_config;
    token::transfer(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.station_ata.to_account_info(),
            authority: ctx.accounts.vault_config.to_account_info(),
        },
        &[&[b"vault_config", &[bump]]],
    ), amount)?;
    let s = &mut ctx.accounts.station;
    s.registered = false; s.unstake_at = 0;
    Ok(())
}
