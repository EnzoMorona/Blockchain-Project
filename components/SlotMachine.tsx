"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  MAX_BET_SOL,
  MIN_BET_SOL,
  SYMBOLS,
  explorerAddressUrl,
  explorerTxUrl,
} from "@/lib/constants";

interface HouseInfo {
  houseAddress: string;
  houseBalanceLamports: number;
  minBetLamports: number;
  maxBetLamports: number;
}

interface HistoryEntry {
  id: string;
  time: number;
  betSol: number;
  reels: string[];
  win: boolean;
  payoutSol: number;
  depositSignature: string;
  payoutSignature: string | null;
}

const BET_PRESETS = [0.01, 0.05, 0.1, 0.2];
const ALL_EMOJIS = SYMBOLS.map((s) => s.emoji);

function stopReelsSequentially(
  finalReels: string[],
  setReels: React.Dispatch<React.SetStateAction<string[]>>
): Promise<void> {
  return new Promise((resolve) => {
    finalReels.forEach((symbol, index) => {
      setTimeout(() => {
        setReels((prev) => {
          const next = [...prev];
          next[index] = symbol;
          return next;
        });
        if (index === finalReels.length - 1) resolve();
      }, (index + 1) * 350);
    });
  });
}

export function SlotMachine() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [betSol, setBetSol] = useState(0.05);
  const [reels, setReels] = useState<string[]>(["❔", "❔", "❔"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [houseError, setHouseError] = useState<string | null>(null);
  const [playerBalanceSol, setPlayerBalanceSol] = useState<number | null>(
    null
  );
  const spinIntervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const loadHouseInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/house-info", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setHouseError(data.error || "Não foi possível carregar a casa.");
        setHouseInfo(null);
        return;
      }
      setHouseError(null);
      setHouseInfo(data);
    } catch {
      setHouseError("Não foi possível conectar ao servidor.");
    }
  }, []);

  const loadPlayerBalance = useCallback(async () => {
    if (!publicKey) {
      setPlayerBalanceSol(null);
      return;
    }
    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setPlayerBalanceSol(lamports / LAMPORTS_PER_SOL);
    } catch {
      // silencioso: apenas exibição de saldo, não é crítico
    }
  }, [connection, publicKey]);

  useEffect(() => {
    loadHouseInfo();
    const interval = setInterval(loadHouseInfo, 20000);
    return () => clearInterval(interval);
  }, [loadHouseInfo]);

  useEffect(() => {
    loadPlayerBalance();
  }, [loadPlayerBalance]);

  useEffect(() => {
    return () => {
      spinIntervals.current.forEach(clearInterval);
    };
  }, []);

  const minBetSol = houseInfo ? houseInfo.minBetLamports / LAMPORTS_PER_SOL : MIN_BET_SOL;
  const maxBetSol = houseInfo ? houseInfo.maxBetLamports / LAMPORTS_PER_SOL : MAX_BET_SOL;

  async function handleSpin() {
    if (!publicKey) {
      setError("Conecte sua carteira primeiro.");
      return;
    }
    if (betSol < minBetSol || betSol > maxBetSol) {
      setError(
        `Aposta precisa estar entre ${minBetSol.toFixed(3)} e ${maxBetSol.toFixed(3)} SOL.`
      );
      return;
    }

    setError(null);
    setMessage(null);
    setSpinning(true);

    const betLamports = Math.round(betSol * LAMPORTS_PER_SOL);

    spinIntervals.current = [0, 1, 2].map((i) =>
      setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[i] = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
          return next;
        });
      }, 90)
    );

    try {
      const prepareRes = await fetch("/api/spin/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: publicKey.toBase58(), betLamports }),
      });
      const prepareData = await prepareRes.json();
      if (!prepareRes.ok) {
        throw new Error(prepareData.error || "Não foi possível preparar a aposta.");
      }

      const houseAddress = new PublicKey(prepareData.houseAddress);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: houseAddress,
          lamports: betLamports,
        })
      );

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      const resolveRes = await fetch("/api/spin/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          player: publicKey.toBase58(),
          betLamports,
        }),
      });
      const result = await resolveRes.json();
      if (!resolveRes.ok) {
        throw new Error(result.error || "Erro ao resolver o giro.");
      }

      spinIntervals.current.forEach(clearInterval);
      spinIntervals.current = [];

      await stopReelsSequentially(result.reels, setReels);

      const entry: HistoryEntry = {
        id: signature,
        time: Date.now(),
        betSol,
        reels: result.reels,
        win: result.win,
        payoutSol: result.payoutLamports / LAMPORTS_PER_SOL,
        depositSignature: signature,
        payoutSignature: result.payoutSignature,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 20));

      if (result.win) {
        setMessage(
          `Você ganhou ${(result.payoutLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL! 🎉`
        );
      } else {
        setMessage("Não foi dessa vez. Tenta de novo!");
      }

      if (result.error) {
        setError(result.error);
      }

      await Promise.all([loadHouseInfo(), loadPlayerBalance()]);
    } catch (err) {
      spinIntervals.current.forEach(clearInterval);
      spinIntervals.current = [];
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">🎰 Slot Solana</h1>
        <p className="text-zinc-400 text-sm">
          Devnet only — SOL de faucet, sem valor real. Deposite, gire e, se
          as 3 rodinhas caírem iguais, você ganha de volta multiplicado.
        </p>
      </header>

      <div className="flex flex-col items-center gap-2">
        <WalletMultiButton />
        {connected && publicKey && (
          <p className="text-xs text-zinc-500">
            Saldo:{" "}
            {playerBalanceSol !== null ? `${playerBalanceSol.toFixed(4)} SOL` : "..."}
          </p>
        )}
      </div>

      <div className="glow-border rounded-2xl bg-zinc-900/80 p-6 w-full flex flex-col items-center gap-5">
        <div className="flex gap-4">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className="reel-box w-24 h-24 rounded-xl bg-zinc-950 flex items-center justify-center text-5xl animate-reel-pop"
            >
              {symbol}
            </div>
          ))}
        </div>

        <div className="w-full flex flex-col gap-2">
          <label className="text-sm text-zinc-400 flex justify-between">
            <span>Aposta (SOL)</span>
            <span>
              min {minBetSol.toFixed(3)} · max {maxBetSol.toFixed(3)}
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            min={minBetSol}
            max={maxBetSol}
            value={betSol}
            disabled={spinning}
            onChange={(e) => setBetSol(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-lg"
          />
          <div className="flex gap-2">
            {BET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={spinning}
                onClick={() => setBetSol(preset)}
                className="flex-1 text-xs py-1.5 rounded-lg border border-zinc-800 hover:border-purple-500 transition disabled:opacity-40"
              >
                {preset} SOL
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSpin}
          disabled={!connected || spinning || !houseInfo}
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 font-semibold text-lg transition"
        >
          {spinning ? "Girando..." : "🎲 Girar"}
        </button>

        {message && <p className="text-center text-sm">{message}</p>}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        {houseError && (
          <p className="text-center text-xs text-red-400">
            Casa indisponível: {houseError}
          </p>
        )}
      </div>

      <div className="w-full rounded-2xl bg-zinc-900/60 p-4 text-sm">
        <h2 className="font-semibold mb-2">Tabela de prêmios</h2>
        <ul className="grid grid-cols-2 gap-y-1 text-zinc-400">
          {SYMBOLS.map((s) => (
            <li key={s.id}>
              {s.emoji}{s.emoji}{s.emoji} → {s.multiplier}x
            </li>
          ))}
        </ul>
      </div>

      {houseInfo && (
        <p className="text-xs text-zinc-500 text-center">
          Carteira da casa (devnet):{" "}
          <a
            className="underline hover:text-purple-400"
            href={explorerAddressUrl(houseInfo.houseAddress)}
            target="_blank"
            rel="noreferrer"
          >
            {houseInfo.houseAddress.slice(0, 4)}...{houseInfo.houseAddress.slice(-4)}
          </a>{" "}
          · saldo {(houseInfo.houseBalanceLamports / LAMPORTS_PER_SOL).toFixed(3)} SOL
        </p>
      )}

      {history.length > 0 && (
        <div className="w-full rounded-2xl bg-zinc-900/60 p-4 text-sm">
          <h2 className="font-semibold mb-2">Histórico</h2>
          <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2"
              >
                <span>
                  {entry.reels.join(" ")} · {entry.betSol.toFixed(3)} SOL
                </span>
                <span className={entry.win ? "text-emerald-400" : "text-zinc-500"}>
                  {entry.win ? `+${entry.payoutSol.toFixed(4)} SOL` : "perdeu"}
                </span>
                <span className="flex gap-2">
                  <a
                    className="underline hover:text-purple-400"
                    href={explorerTxUrl(entry.depositSignature)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    depósito
                  </a>
                  {entry.payoutSignature && (
                    <a
                      className="underline hover:text-purple-400"
                      href={explorerTxUrl(entry.payoutSignature)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      pagamento
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
