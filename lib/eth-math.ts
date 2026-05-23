/**
 * BigInt-safe wei → ETH conversion.
 *
 * The naïve pattern `Number(wei) / 10 ** decimals` loses precision once
 * wei exceeds Number.MAX_SAFE_INTEGER (2^53 ≈ 9e15). For 18-decimal
 * tokens that's roughly 9000 ETH per BigInt, well within whale range.
 *
 * This helper splits the value into integer ETH (via BigInt math, always
 * precise) plus a 6-significant-digit fraction. Result is a Number
 * suitable for display, sorting, and JSON serialization.
 */

export function weiToEth(
  wei: bigint | string | number,
  decimals = 18,
  fractionDigits = 6,
): number {
  let b: bigint;
  try {
    b =
      typeof wei === "bigint" ? wei
      : typeof wei === "string" ? BigInt(wei)
      : BigInt(Math.trunc(wei));
  } catch {
    return 0;
  }
  if (b <= 0n) return 0;

  const divisor = 10n ** BigInt(decimals);
  const whole = b / divisor;             // BigInt — safe up to 2^53 ETH
  const remainder = b % divisor;         // < divisor

  // Take the top `fractionDigits` of the remainder as a small Number.
  // Pad-left so e.g. 1n with decimals=18 becomes "000…001" and we read
  // the leading 6 digits (which are all zero — under-display).
  const remStr = remainder.toString().padStart(decimals, "0").slice(0, fractionDigits);
  const fraction = Number(remStr) / 10 ** fractionDigits;

  return Number(whole) + fraction;
}

/**
 * Convenience: accepts an OpenSea-style `payment` object and returns
 * ETH (or 0 if missing/invalid). Centralizes the decimals-default and
 * shape check so callers don't repeat the pattern.
 */
export function paymentToEth(payment: { quantity?: string; decimals?: number } | undefined | null): number {
  if (!payment?.quantity) return 0;
  return weiToEth(payment.quantity, payment.decimals ?? 18);
}
