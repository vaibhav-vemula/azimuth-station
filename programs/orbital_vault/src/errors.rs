use anchor_lang::prelude::*;

#[error_code]
pub enum AzimuthError {
    #[msg("Not the program authority")]
    NotAuthority,
    #[msg("Station already registered")]
    AlreadyRegistered,
    #[msg("Station not registered")]
    NotRegistered,
    #[msg("Station not active")]
    NotActive,
    #[msg("Station already active")]
    AlreadyActive,
    #[msg("No pending unstake")]
    NoPendingUnstake,
    #[msg("Unstake cooldown not elapsed")]
    CooldownNotElapsed,
    #[msg("PoA epoch interval not elapsed")]
    EpochNotReady,
    #[msg("Proof already submitted for this pass")]
    AlreadySubmitted,
    #[msg("Invalid packet count")]
    BadPacketCount,
    #[msg("Proof not found")]
    NoProof,
    #[msg("Proof not yet claimed")]
    NotClaimed,
    #[msg("Proof already verified")]
    AlreadyVerified,
    #[msg("Cannot self-verify")]
    CannotSelfVerify,
    #[msg("Verifier has no proof for this pass")]
    VerifierNoProof,
    #[msg("Proof not in payable state (claimed+verified+unpaid required)")]
    InvalidPayoutState,
    #[msg("Proof already claimed")]
    AlreadyClaimed,
    #[msg("Image already recorded for this pass")]
    AlreadyRecorded,
    #[msg("Arweave TX ID cannot be empty")]
    EmptyArweaveTxId,
    #[msg("Location string too long (max 100 chars)")]
    LocationTooLong,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Station list full (max 200)")]
    StationListFull,
    #[msg("Cannot verify — already paid")]
    AlreadyPaid,
}
