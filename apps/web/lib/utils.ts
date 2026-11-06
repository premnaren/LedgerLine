import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer paise/pence into Indian Rupee display using strict BigInt math.
 * Avoids all IEEE 754 floating-point division.
 */
export function formatPaiseToRupees(pence: string | number | bigint): string {
  const bigPence = BigInt(pence || 0);
  const isNegative = bigPence < 0n;
  const absPence = isNegative ? -bigPence : bigPence;
  const wholeRupees = absPence / 100n;
  const paise = absPence % 100n;

  const formattedWhole = wholeRupees.toLocaleString('en-IN');
  const formattedPaise = paise.toString().padStart(2, '0');
  const sign = isNegative ? '-' : '';

  return `${sign}₹${formattedWhole}.${formattedPaise}`;
}

/**
 * Convert user input rupees string (e.g. "1500.50") into integer paise using BigInt.
 * Guarantees zero floating-point multiplication errors.
 */
export function parseRupeesToPaise(val: string): bigint {
  const trimmed = val.trim();
  if (!trimmed) return 0n;
  const [wholePart, fracPart] = trimmed.split('.');
  const whole = BigInt(wholePart || '0');
  if (!fracPart) {
    return whole * 100n;
  }
  const frac = fracPart.padEnd(2, '0').slice(0, 2);
  return whole * 100n + BigInt(frac);
}

