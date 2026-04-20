use anchor_lang::prelude::*;
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
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Slash>, reason: String) -> Result<()> {
    let penalty = ctx.accounts.vault_config.stake_amount / 2;
    if penalty > 0 {
        **ctx.accounts.vault_config.to_account_info().try_borrow_mut_lamports()? -= penalty;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += penalty;
    }
    ctx.accounts.station.active = false;
    emit!(Slashed { station: ctx.accounts.station_wallet.key(), amount: penalty, reason });
    Ok(())
}
