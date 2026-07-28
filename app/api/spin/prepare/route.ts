import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getConnection, getHouseKeypair } from "@/lib/house";
import { MIN_BET_SOL, MAX_BET_SOL, MAX_MULTIPLIER } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { player, betLamports } = body as {
      player?: string;
      betLamports?: number;
    };

    if (!player || typeof betLamports !== "number" || !Number.isFinite(betLamports)) {
      return NextResponse.json(
        { error: "Requisição inválida." },
        { status: 400 }
      );
    }

    try {
      new PublicKey(player);
    } catch {
      return NextResponse.json(
        { error: "Endereço de carteira inválido." },
        { status: 400 }
      );
    }

    const connection = getConnection();
    const house = getHouseKeypair();
    const houseBalanceLamports = await connection.getBalance(
      house.publicKey,
      "confirmed"
    );

    const minBetLamports = Math.round(MIN_BET_SOL * LAMPORTS_PER_SOL);
    const safeMaxBetLamports = Math.floor(
      (houseBalanceLamports * 0.5) / MAX_MULTIPLIER
    );
    const maxBetLamports = Math.max(
      0,
      Math.min(Math.round(MAX_BET_SOL * LAMPORTS_PER_SOL), safeMaxBetLamports)
    );

    if (betLamports < minBetLamports) {
      return NextResponse.json(
        {
          error: `Aposta mínima é ${(minBetLamports / LAMPORTS_PER_SOL).toFixed(3)} SOL.`,
        },
        { status: 400 }
      );
    }

    if (betLamports > maxBetLamports) {
      return NextResponse.json(
        {
          error: `A casa não tem fundos suficientes para cobrir essa aposta agora. Aposta máxima atual: ${(
            maxBetLamports / LAMPORTS_PER_SOL
          ).toFixed(3)} SOL.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      houseAddress: house.publicKey.toBase58(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido." },
      { status: 500 }
    );
  }
}
