import "server-only";
import { Connection, Keypair } from "@solana/web3.js";
import { decode } from "bs58";

function loadHouseKeypair(): Keypair {
  const raw = process.env.HOUSE_SECRET_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "HOUSE_SECRET_KEY não configurada. Rode `npm run setup:house` e preencha o .env.local."
    );
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(trimmed)));
  }
  return Keypair.fromSecretKey(decode(trimmed));
}

let cachedKeypair: Keypair | null = null;
export function getHouseKeypair(): Keypair {
  if (!cachedKeypair) cachedKeypair = loadHouseKeypair();
  return cachedKeypair;
}

let cachedConnection: Connection | null = null;
export function getConnection(): Connection {
  if (!cachedConnection) {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.devnet.solana.com";
    cachedConnection = new Connection(rpcUrl, "confirmed");
  }
  return cachedConnection;
}
