use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use crate::state::VaultConfig;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = VaultConfig::LEN,
        seeds = [b"vault_config"],
        bump
    )]
    pub vault_config: Account<'info, VaultConfig>,

    #[account(
        mut,
        associated_token::mint = azm_mint,
        associated_token::authority = vault_config,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    pub azm_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<Initialize>,
    poa_epoch_interval: i64,
    poa_reward_amount: u64,
    porx_base_reward: u64,
    stake_amount: u64,
    unstake_cooldown: i64,
    heartbeat_threshold: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let cfg = &mut ctx.accounts.vault_config;
    cfg.authority = ctx.accounts.authority.key();
    cfg.azm_mint = ctx.accounts.azm_mint.key();
    cfg.vault_ata = ctx.accounts.vault_ata.key();
    cfg.poa_epoch_count = 0;
    cfg.poa_epoch_start = clock.unix_timestamp;
    cfg.poa_epoch_interval = poa_epoch_interval;
    cfg.poa_reward_amount = poa_reward_amount;
    cfg.porx_base_reward = porx_base_reward;
    cfg.stake_amount = stake_amount;
    cfg.unstake_cooldown = unstake_cooldown;
    cfg.heartbeat_threshold = heartbeat_threshold;
    cfg.station_list = Vec::new();
    Ok(())
}
