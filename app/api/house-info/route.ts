import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getHouseKeypair } from "@/lib/house";
import { MIN_BET_SOL, MAX_BET_SOL, MAX_MULTIPLIER } from "@/lib/constants";

export async function GET() {
  try {
    const connection = getConnection();
    const house = getHouseKeypair();
    const houseBalanceLamports = await connection.getBalance(
      house.publicKey,
      "confirmed"
    );

    // Nunca deixa a aposta máxima expor a casa a um payout maior do que ela
    // consegue pagar: limita ao pior caso (símbolo de maior multiplicador).
    const safeMaxBetLamports = Math.floor(
      (houseBalanceLamports * 0.5) / MAX_MULTIPLIER
    );
    const maxBetLamports = Math.max(
      0,
      Math.min(Math.round(MAX_BET_SOL * LAMPORTS_PER_SOL), safeMaxBetLamports)
    );

    return NextResponse.json({
      houseAddress: house.publicKey.toBase58(),
      houseBalanceLamports,
      minBetLamports: Math.round(MIN_BET_SOL * LAMPORTS_PER_SOL),
      maxBetLamports,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido." },
      { status: 500 }
    );
  }
}
