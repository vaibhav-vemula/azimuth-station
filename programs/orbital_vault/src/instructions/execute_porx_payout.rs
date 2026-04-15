use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(pass_id: [u8; 32])]
pub struct ExecutePorxPayout<'info> {
    #[account(mut, seeds = [b"vault_config"], bump)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(mut, seeds = [b"porx", pass_id.as_ref(), station_authority.key().as_ref()], bump,
        constraint = porx_proof.claimed @ AzimuthError::NotClaimed,
        constraint = porx_proof.verified @ AzimuthError::NotClaimed,
        constraint = !porx_proof.paid @ AzimuthError::InvalidPayoutState)]
    pub porx_proof: Account<'info, PoRxProof>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = vault_config)]
    pub vault_ata: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = vault_config.azm_mint, associated_token::authority = station_authority)]
    pub station_ata: Account<'info, TokenAccount>,
    /// CHECK: station wallet
    pub station_authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"station", station_authority.key().as_ref()], bump)]
    pub station: Account<'info, Station>,
    pub token_program: Program<'info, Token>,
}
pub fn handler(ctx: Context<ExecutePorxPayout>, pass_id: [u8; 32]) -> Result<()> {
    let amount = ctx.accounts.porx_proof.reward_amount;
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
    ctx.accounts.porx_proof.paid = true;
    ctx.accounts.station.total_porx_rewards = ctx.accounts.station.total_porx_rewards.checked_add(amount).ok_or(AzimuthError::Overflow)?;
    emit!(PoRxPaid { station: ctx.accounts.station_authority.key(), pass_id, amount });
    Ok(())
}
