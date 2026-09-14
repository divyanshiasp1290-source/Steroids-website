export type CryptoCoin = {
  id: string;
  name: string;
  symbol: string;
  network: string;
  defaultAddress: string;
  qrPrefix?: string;
  iconColor: string;
  badgeText?: string;
  explorerUrl: (tx: string) => string;
};

export const CRYPTO_COINS: CryptoCoin[] = [
  {
    id: "usdt_trc20",
    name: "Tether USDT",
    symbol: "USDT",
    network: "TRC-20 (Tron Network)",
    defaultAddress: "TL31Z6zY7J2pMh5qXo4k9Bw1R8sE7wV4tP",
    iconColor: "text-emerald-500",
    badgeText: "Recommended · Lowest Fees",
    explorerUrl: (tx: string) => `https://tronscan.org/#/transaction/${tx.trim()}`,
  },
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin Network",
    defaultAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    qrPrefix: "bitcoin:",
    iconColor: "text-amber-500",
    explorerUrl: (tx: string) => `https://www.blockchain.com/explorer/transactions/btc/${tx.trim()}`,
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    network: "ERC-20 (Ethereum Network)",
    defaultAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    qrPrefix: "ethereum:",
    iconColor: "text-indigo-400",
    explorerUrl: (tx: string) => `https://etherscan.io/tx/${tx.trim()}`,
  },
  {
    id: "usdt_erc20",
    name: "Tether USDT",
    symbol: "USDT (ERC-20)",
    network: "ERC-20 (Ethereum Network)",
    defaultAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    iconColor: "text-emerald-400",
    explorerUrl: (tx: string) => `https://etherscan.io/tx/${tx.trim()}`,
  },
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    network: "Solana Network",
    defaultAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    iconColor: "text-purple-400",
    explorerUrl: (tx: string) => `https://solscan.io/tx/${tx.trim()}`,
  },
  {
    id: "ltc",
    name: "Litecoin",
    symbol: "LTC",
    network: "Litecoin Network",
    defaultAddress: "ltc1q4m9f8h2w7k4e9z5x2p1m6v8n3j7c5t2y4r6q8s",
    qrPrefix: "litecoin:",
    iconColor: "text-blue-400",
    explorerUrl: (tx: string) => `https://blockchair.com/litecoin/transaction/${tx.trim()}`,
  },
];

export function getCryptoCoin(id: string): CryptoCoin {
  return CRYPTO_COINS.find((c) => c.id === id) || CRYPTO_COINS[0];
}

export function getWalletAddress(
  coinId: string,
  settings?: Record<string, Record<string, unknown>> | null,
): string {
  const coin = getCryptoCoin(coinId);
  const custom = settings?.crypto_wallets?.[coinId];
  if (typeof custom === "string" && custom.trim().length > 0) {
    return custom.trim();
  }
  return coin.defaultAddress;
}

export function getQrCodeUrl(address: string, qrPrefix?: string): string {
  const payload = qrPrefix ? `${qrPrefix}${address}` : address;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}&margin=10`;
}
