import { Check, Copy, ExternalLink, Info, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { CRYPTO_COINS, getCryptoCoin, getQrCodeUrl, getWalletAddress, type CryptoCoin } from "@/lib/crypto";
import { formatPrice } from "@/lib/format";

export type CryptoPaymentCardProps = {
  total: number;
  selectedCoinId: string;
  onSelectCoinId: (id: string) => void;
  txid: string;
  onChangeTxid: (txid: string) => void;
  settings?: Record<string, Record<string, unknown>> | null;
  readOnly?: boolean;
};

export function CryptoPaymentCard({
  total,
  selectedCoinId,
  onSelectCoinId,
  txid,
  onChangeTxid,
  settings,
  readOnly = false,
}: CryptoPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const coin = getCryptoCoin(selectedCoinId);
  const address = getWalletAddress(selectedCoinId, settings);
  const qrUrl = getQrCodeUrl(address, coin.qrPrefix);

  const customInstructions =
    typeof settings?.crypto_wallets?.instructions === "string" &&
    settings.crypto_wallets.instructions.trim().length > 0
      ? (settings.crypto_wallets.instructions as string)
      : null;

  function copyToClipboard() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success(`${coin.symbol} wallet address copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Cryptocurrency Payment</h3>
            <p className="text-xs text-muted-foreground">
              Instant settlement · Insured dispatch · No banking delays
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Blockchain Secured</span>
        </div>
      </div>

      {/* Coin Selector */}
      {!readOnly ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Select Cryptocurrency
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CRYPTO_COINS.map((c) => {
              const isSelected = c.id === selectedCoinId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCoinId(c.id)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{c.symbol}</span>
                    {c.badgeText ? (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                        Fast
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{c.name}</span>
                  <span className="mt-1 text-[10px] text-muted-foreground/80 font-mono truncate w-full">
                    {c.network.split("(")[0]?.trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Wallet Display Box */}
      <div className="space-y-3 rounded-lg border border-border/80 bg-background/90 p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {!readOnly ? "2. Send Payment to Wallet" : "Designated Wallet Address"}
          </label>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {coin.network}
          </Badge>
        </div>

        <div className="grid gap-5 sm:grid-cols-[140px_1fr] sm:items-center">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center space-y-1.5 rounded-lg border border-border/80 bg-white p-2 text-center shadow-xs">
            <img
              src={qrUrl}
              alt={`${coin.symbol} QR Code`}
              className="h-32 w-32 object-contain"
              loading="lazy"
            />
            <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-600">
              <QrCode className="h-3 w-3" /> Scan to pay
            </span>
          </div>

          {/* Address & Amount Details */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Amount to send:</span>
                <span className="font-bold text-foreground text-sm">{formatPrice(total)}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Equivalent value in {coin.symbol} at current market rate.
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                Deposit Address:
              </span>
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-2">
                <span className="flex-1 font-mono text-xs break-all select-all text-foreground">
                  {address}
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-primary text-primary-foreground hover:bg-accent"
                  }`}
                  title="Copy address"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md p-2 border border-amber-500/20">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> Send only <strong>{coin.symbol}</strong> via the{" "}
                <strong>{coin.network}</strong>. Sending via any other network may cause permanent loss.
              </span>
            </div>
          </div>
        </div>

        {customInstructions ? (
          <div className="mt-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground border border-border/60">
            <p className="font-medium text-foreground mb-0.5">Instructions from Merchant:</p>
            <p className="whitespace-pre-line">{customInstructions}</p>
          </div>
        ) : null}
      </div>

      {/* Transaction ID / Validation Proof Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{!readOnly ? "3. Order Validation (TXID / Hash)" : "Transaction Hash (TXID)"}</span>
          <span className="text-[11px] font-normal normal-case text-muted-foreground">
            Optional / recommended
          </span>
        </label>
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="Paste your blockchain transaction hash (TXID) or sender address…"
            value={txid}
            onChange={(e) => onChangeTxid(e.target.value)}
            disabled={readOnly}
            className="w-full rounded-md border border-border bg-background px-3.5 py-2.5 text-xs font-mono outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-75"
          />
          <p className="text-[11px] text-muted-foreground">
            Once sent from your wallet/exchange, paste the Transaction ID (TXID) to fast-track
            automated blockchain validation and dispatch.
          </p>
        </div>
      </div>
    </div>
  );
}
