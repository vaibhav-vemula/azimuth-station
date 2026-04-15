use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::AzimuthError;

#[derive(Accounts)]
#[instruction(pass_id: [u8; 32])]
pub struct SubmitPorx<'info> {
    #[account(seeds = [b"vault_config"], bump)]
    pub vault_config: Account<'info, VaultConfig>,
    #[account(seeds = [b"station", authority.key().as_ref()], bump,
        constraint = station.registered @ AzimuthError::NotRegistered,
        constraint = station.active @ AzimuthError::NotActive)]
    pub station: Account<'info, Station>,
    #[account(init, payer = authority, space = PoRxProof::LEN,
        seeds = [b"porx", pass_id.as_ref(), authority.key().as_ref()], bump)]
    pub porx_proof: Account<'info, PoRxProof>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
pub fn handler(ctx: Context<SubmitPorx>, pass_id: [u8; 32], packet_count: u16, total_packets: u16, packet_merkle: [u8; 32], avg_rssi: i16, avg_snr: i16) -> Result<()> {
    require!(packet_count > 0 && packet_count <= total_packets, AzimuthError::BadPacketCount);
    let reward = (packet_count as u64).checked_mul(ctx.accounts.vault_config.porx_base_reward).ok_or(AzimuthError::Overflow)?;
    let p = &mut ctx.accounts.porx_proof;
    p.station = ctx.accounts.authority.key(); p.pass_id = pass_id;
    p.packet_count = packet_count; p.total_packets = total_packets;
    p.packet_merkle = packet_merkle; p.avg_rssi = avg_rssi; p.avg_snr = avg_snr;
    p.submitted_at = Clock::get()?.unix_timestamp; p.reward_amount = reward;
    p.claimed = false; p.verified = false; p.paid = false;
    emit!(PoRxSubmitted { station: ctx.accounts.authority.key(), pass_id, packet_count });
    Ok(())
}
