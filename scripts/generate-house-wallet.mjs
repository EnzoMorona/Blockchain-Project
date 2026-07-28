import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

async function main() {
  const keypair = Keypair.generate();
  const secretBase58 = bs58.encode(keypair.secretKey);

  console.log("\n=== Carteira da casa (devnet) gerada ===");
  console.log("Endereço público:", keypair.publicKey.toBase58());
  console.log("\nAdicione isso no seu .env.local:");
  console.log(`HOUSE_SECRET_KEY=${secretBase58}`);
  console.log(
    "\nGuarde essa chave em segredo. NÃO faça commit do .env.local nem dessa chave em lugar nenhum público.\n"
  );

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  try {
    console.log(`Solicitando airdrop de 2 SOL via ${rpcUrl} ...`);
    const sig = await connection.requestAirdrop(
      keypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop confirmado! A casa já tem 2 SOL de devnet.");
  } catch (err) {
    console.warn(
      "\nAirdrop automático falhou (comum em RPCs públicos por rate limit)."
    );
    console.warn(
      `Peça SOL manualmente em https://faucet.solana.com para o endereço ${keypair.publicKey.toBase58()}`
    );
    console.warn("Erro:", err instanceof Error ? err.message : err);
  }
}

main();
