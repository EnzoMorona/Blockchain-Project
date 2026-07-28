import { NextResponse } from "next/server";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ParsedInstruction,
} from "@solana/web3.js";
import { getConnection, getHouseKeypair } from "@/lib/house";
import { isSignatureUsed, markSignatureUsed } from "@/lib/used-signatures";
import { resolveSpin } from "@/lib/spin-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { signature, player, betLamports } = body as {
      signature?: string;
      player?: string;
      betLamports?: number;
    };

    if (
      typeof signature !== "string" ||
      typeof player !== "string" ||
      typeof betLamports !== "number" ||
      !Number.isFinite(betLamports)
    ) {
      return NextResponse.json(
        { error: "Requisição inválida." },
        { status: 400 }
      );
    }

    if (isSignatureUsed(signature)) {
      return NextResponse.json(
        { error: "Essa transação de depósito já foi processada." },
        { status: 409 }
      );
    }

    let playerKey: PublicKey;
    try {
      playerKey = new PublicKey(player);
    } catch {
      return NextResponse.json(
        { error: "Endereço de carteira inválido." },
        { status: 400 }
      );
    }

    const connection = getConnection();
    const house = getHouseKeypair();

    // Confirma na chain que o depósito realmente aconteceu, veio do jogador
    // certo, foi pra carteira da casa e tem o valor da aposta informada —
    // sem isso, qualquer um poderia chamar essa rota e pedir pagamento sem
    // ter depositado nada.
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || tx.meta?.err) {
      return NextResponse.json(
        { error: "Transação de depósito não encontrada ou falhou." },
        { status: 400 }
      );
    }

    const houseAddress = house.publicKey.toBase58();
    const playerAddress = playerKey.toBase58();

    const transferIx = tx.transaction.message.instructions.find((ix) => {
      const parsed = (ix as ParsedInstruction).parsed;
      return (
        "parsed" in ix &&
        (ix as ParsedInstruction).program === "system" &&
        parsed?.type === "transfer" &&
        parsed?.info?.source === playerAddress &&
        parsed?.info?.destination === houseAddress &&
        Number(parsed?.info?.lamports) === betLamports
      );
    });

    if (!transferIx) {
      return NextResponse.json(
        { error: "Depósito não confere com a aposta informada." },
        { status: 400 }
      );
    }

    markSignatureUsed(signature);

    const spin = resolveSpin();
    let payoutLamports = 0;
    let payoutSignature: string | null = null;
    let payoutError: string | null = null;

    if (spin.win) {
      payoutLamports = betLamports * spin.multiplier;
      const houseBalance = await connection.getBalance(
        house.publicKey,
        "confirmed"
      );

      if (payoutLamports > houseBalance) {
        payoutError =
          "Você ganhou, mas a casa está sem saldo suficiente pra pagar agora. Avise o organizador do desafio pra reabastecer a carteira da casa e tente resgatar depois.";
      } else {
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        const payoutTx = new Transaction({
          feePayer: house.publicKey,
          blockhash,
          lastValidBlockHeight,
        }).add(
          SystemProgram.transfer({
            fromPubkey: house.publicKey,
            toPubkey: playerKey,
            lamports: payoutLamports,
          })
        );

        payoutSignature = await sendAndConfirmTransaction(
          connection,
          payoutTx,
          [house],
          { commitment: "confirmed" }
        );
      }
    }

    return NextResponse.json({
      reels: spin.reels.map((s) => s.emoji),
      win: spin.win,
      multiplier: spin.multiplier,
      payoutLamports,
      payoutSignature,
      error: payoutError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido." },
      { status: 500 }
    );
  }
}
