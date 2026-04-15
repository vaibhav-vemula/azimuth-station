use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(pass_id: [u8; 32])]
pub struct VerifyPorx<'info> {
    #[account(seeds = [b"station", verifier.key().as_ref()], bump,
        constraint = verifier_station.registered @ AzimuthError::NotRegistered,
        constraint = verifier_station.active @ AzimuthError::NotActive)]
    pub verifier_station: Account<'info, Station>,
    #[account(mut, seeds = [b"porx", pass_id.as_ref(), target_station.key().as_ref()], bump,
        constraint = porx_proof.claimed @ AzimuthError::NotClaimed,
        constraint = !porx_proof.verified @ AzimuthError::AlreadyVerified,
        constraint = !porx_proof.paid @ AzimuthError::AlreadyPaid)]
    pub porx_proof: Account<'info, PoRxProof>,
    // verifier's own proof for same pass — must exist
    #[account(seeds = [b"porx", pass_id.as_ref(), verifier.key().as_ref()], bump)]
    pub verifier_proof: Account<'info, PoRxProof>,
    /// CHECK: target station wallet
    pub target_station: UncheckedAccount<'info>,
    pub verifier: Signer<'info>,
}
pub fn handler(ctx: Context<VerifyPorx>, pass_id: [u8; 32]) -> Result<()> {
    require!(ctx.accounts.target_station.key() != ctx.accounts.verifier.key(), AzimuthError::CannotSelfVerify);
    ctx.accounts.porx_proof.verified = true;
    emit!(PoRxVerified { station: ctx.accounts.target_station.key(), pass_id, verifier: ctx.accounts.verifier.key() });
    Ok(())
}
