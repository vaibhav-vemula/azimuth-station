use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
pub struct Slash<'info> {
    #[account(mut, seeds = [b"vault_config"], bump, has_one = authority @ AzimuthError::NotAuthority)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(mut, seeds = [b"station", station_wallet.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered)]
    pub station: Account<'info, Station>,
    /// CHECK: station wallet
    pub station_wallet: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = vault_config)]
    pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = authority)]
    pub authority_ata: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
pub fn handler(ctx: Context<Slash>, reason: String) -> Result<()> {
    let penalty = ctx.accounts.vault_config.stake_amount / 2;
    let bump = ctx.bumps.vault_config;
    token::transfer(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.vault_ata.to_account_info(),
            to: ctx.accounts.authority_ata.to_account_info(),
            authority: ctx.accounts.vault_config.to_account_info(),
        },
        &[&[b"vault_config", &[bump]]],
    ), penalty)?;
    ctx.accounts.station.active = false;
    emit!(Slashed { station: ctx.accounts.station_wallet.key(), amount: penalty, reason });
    Ok(())
}
