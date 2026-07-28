import { randomInt } from "crypto";
import { SYMBOLS, TOTAL_WEIGHT, type SlotSymbol } from "./constants";

// Servidor decide o resultado com o CSPRNG do Node. É centralizado/custodial
// e não é "provably fair" on-chain — escolha deliberada para entregar rápido
// num demo de devnet. Para produção real, isso precisaria virar um programa
// on-chain com uma fonte de aleatoriedade verificável (ex.: Switchboard VRF).
function pickSymbol(): SlotSymbol {
  let roll = randomInt(0, TOTAL_WEIGHT);
  for (const symbol of SYMBOLS) {
    if (roll < symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export interface SpinOutcome {
  reels: SlotSymbol[];
  win: boolean;
  multiplier: number;
}

export function resolveSpin(): SpinOutcome {
  const reels = [pickSymbol(), pickSymbol(), pickSymbol()];
  const win = reels[0].id === reels[1].id && reels[1].id === reels[2].id;
  return { reels, win, multiplier: win ? reels[0].multiplier : 0 };
}
