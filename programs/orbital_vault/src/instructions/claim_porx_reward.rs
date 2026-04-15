use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(pass_id: [u8; 32])]
pub struct ClaimPorxReward<'info> {
    #[account(seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = station.active @ AzimuthError::NotActive)]
    pub station: Account<'info, Station>,
    #[account(mut, seeds = [b"porx", pass_id.as_ref(), authority.key().as_ref()], bump,
        constraint = !porx_proof.claimed @ AzimuthError::AlreadyClaimed)]
    pub porx_proof: Account<'info, PoRxProof>,
    pub authority: Signer<'info>,
}
pub fn handler(ctx: Context<ClaimPorxReward>, _pass_id: [u8; 32]) -> Result<()> {
    ctx.accounts.porx_proof.claimed = true;
    Ok(())
}
