export const SOLANA_CLUSTER = "devnet";

export interface SlotSymbol {
  id: string;
  emoji: string;
  label: string;
  weight: number;
  multiplier: number;
}

// Pesos maiores = símbolo mais comum. Multiplicador aplicado sobre a aposta
// quando os 3 rolos caem nesse mesmo símbolo.
export const SYMBOLS: SlotSymbol[] = [
  { id: "cherry", emoji: "🍒", label: "Cereja", weight: 40, multiplier: 2 },
  { id: "lemon", emoji: "🍋", label: "Limão", weight: 30, multiplier: 3 },
  { id: "orange", emoji: "🍊", label: "Laranja", weight: 15, multiplier: 5 },
  { id: "star", emoji: "⭐", label: "Estrela", weight: 10, multiplier: 10 },
  { id: "diamond", emoji: "💎", label: "Diamante", weight: 5, multiplier: 20 },
];

export const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
export const MAX_MULTIPLIER = Math.max(...SYMBOLS.map((s) => s.multiplier));

export const MIN_BET_SOL = 0.01;
export const MAX_BET_SOL = 0.2;

export function explorerTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_CLUSTER}`;
}
