# 🎰 Slot Solana (devnet)

App full stack (Next.js + Solana) construído para o desafio da Superteam
Brasil no TDC Floripa 2026. Você conecta a carteira, deposita um valor em
SOL de **devnet**, gira 3 rodinhas e, se caírem no mesmo símbolo, recebe de
volta multiplicado. Tudo com transações reais na devnet — depósito e
pagamento aparecem no Solana Explorer.

> ⚠️ **Devnet apenas.** Usa SOL de faucet, sem valor real nenhum. Não é um
> jogo de azar real e não deve ser adaptado pra mainnet sem repensar toda a
> parte legal e a aleatoriedade (ver seção "Limitações" abaixo).

## Como funciona

1. O jogador conecta a carteira (Phantom/Solflare) na devnet.
2. Ao clicar em "Girar", o front prepara a aposta com o backend
   (`/api/spin/prepare`), que confere se a casa tem saldo suficiente pra
   cobrir o pior caso de prêmio.
3. O jogador assina e envia uma transferência real de SOL da sua carteira
   pra carteira "casa" (transação on-chain).
4. O front manda a assinatura dessa transação pro backend
   (`/api/spin/resolve`), que:
   - busca a transação na chain e confere que ela realmente transferiu o
     valor certo, do jogador certo, pra carteira da casa;
   - sorteia o resultado (3 símbolos, pesos diferentes por raridade);
   - se os 3 baterem, assina e envia o pagamento de volta ao jogador
     (também uma transação real, a partir da carteira da casa).
5. O front mostra o resultado e os links das transações no Explorer.

## Rodando localmente

```bash
npm install

# gera uma carteira "casa" nova na devnet e tenta dar airdrop de 2 SOL nela
npm run setup:house
```

Copie a `HOUSE_SECRET_KEY` impressa no terminal e crie um `.env.local` (a
partir do `.env.local.example`):

```bash
cp .env.local.example .env.local
```

Preencha `HOUSE_SECRET_KEY` com o valor gerado. Se quiser usar o RPC da
QuickNode do workshop (recomendado — o RPC público da devnet tem rate limit
agressivo), preencha também `NEXT_PUBLIC_SOLANA_RPC_URL`.

Se o airdrop automático falhar (rate limit é comum), peça SOL manualmente
em https://faucet.solana.com ou https://www.pinestake.com/en/faucet para o
endereço público impresso pelo script. **A casa precisa ter SOL suficiente
pra pagar os prêmios** — sem saldo, a aposta máxima permitida cai
automaticamente (o backend recalcula isso a cada giro).

Depois:

```bash
npm run dev
```

Abra http://localhost:3000, conecte uma carteira configurada pra devnet, e
gire.

## Deploy

- **Frontend**: Vercel (ou Netlify). Configure as env vars do projeto:
  - `HOUSE_SECRET_KEY` (secreta — nunca exponha no client)
  - `NEXT_PUBLIC_SOLANA_RPC_URL` (RPC de devnet)
  - opcionalmente `SOLANA_RPC_URL` se quiser um RPC diferente pro backend
- **Carteira da casa**: mantenha ela financiada com SOL de devnet durante o
  período de avaliação. Você pode checar o saldo a qualquer momento em
  `/api/house-info`.

## Limitações conhecidas (de propósito, pelo prazo do desafio)

- **Aleatoriedade centralizada**: o resultado do giro é decidido pelo
  backend (CSPRNG do Node), não por um programa on-chain com fonte de
  aleatoriedade verificável (ex.: Switchboard VRF). Ou seja, não é
  "provably fair" — é um demo educacional, deixado assim intencionalmente
  pra caber no prazo do desafio. Uma versão "de verdade" precisaria de um
  programa Anchor com VRF.
- **Custódia**: a carteira da casa é uma keypair guardada como variável de
  ambiente no servidor, não um programa on-chain com vault PDA.
- **Dedupe de transações em memória**: a proteção contra reuso da mesma
  assinatura de depósito é um `Set` em memória, que reseta a cada cold
  start em ambiente serverless. Suficiente pra um demo de devnet.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · `@solana/web3.js` ·
`@solana/wallet-adapter-react`
