import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OrbitalVault } from "../target/types/orbital_vault";

async function main() {
  const stationPubkey = new anchor.web3.PublicKey(process.env.STATION_PUBKEY!);
  const location = process.env.STATION_LOCATION || "Station A";

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.OrbitalVault as Program<OrbitalVault>;

  const [vaultConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault_config")], program.programId
  );
  const [stationPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("station"), stationPubkey.toBuffer()], program.programId
  );

  await program.methods.registerStation(location).accounts({
    vaultConfig: vaultConfigPda,
    stationAccount: stationPda,
    station: stationPubkey,
    authority: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  }).rpc();

  console.log(`Registered station ${stationPubkey.toBase58()} at PDA ${stationPda.toBase58()}`);
}
main().catch(console.error);
