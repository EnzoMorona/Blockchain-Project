import "server-only";

// Cache em memória para impedir que a mesma transação de depósito seja usada
// duas vezes num mesmo processo. Limitação conhecida: reseta a cada cold
// start em serverless (Vercel). Suficiente para um demo de devnet; um app
// real precisaria de um banco de dados para essa deduplicação.
const usedSignatures = new Set<string>();

export function isSignatureUsed(signature: string): boolean {
  return usedSignatures.has(signature);
}

export function markSignatureUsed(signature: string): void {
  usedSignatures.add(signature);
}
