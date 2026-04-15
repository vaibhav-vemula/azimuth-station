use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(pass_id: [u8; 32])]
pub struct RecordImage<'info> {
    #[account(seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = station.active @ AzimuthError::NotActive)]
    pub station: Account<'info, Station>,
    #[account(init, payer = authority, space = ImageRecord::LEN,
        seeds = [b"image", pass_id.as_ref()], bump)]
    pub image_record: Account<'info, ImageRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn handler(ctx: Context<RecordImage>, pass_id: [u8; 32], arweave_tx_id: String, recovered: u16, total: u16) -> Result<()> {
    require!(!arweave_tx_id.is_empty(), AzimuthError::EmptyArweaveTxId);
    let r = &mut ctx.accounts.image_record;
    r.pass_id = pass_id; r.arweave_tx_id = arweave_tx_id.clone();
    r.recovered = recovered; r.total = total;
    r.submitter = ctx.accounts.authority.key();
    r.recorded_at = Clock::get()?.unix_timestamp;
    emit!(ImageMerged { pass_id, arweave_tx_id, submitter: ctx.accounts.authority.key(), recovered, total });
    Ok(())
}
