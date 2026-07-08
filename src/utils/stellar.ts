import { StrKey } from '@stellar/stellar-sdk';

export function isValidPublicKey(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(value);
}

export function isValidAssetCode(code: string): boolean {
  return /^[A-Za-z0-9]{1,12}$/.test(code);
}

export function isNativeAsset(code: string): boolean {
  return code.toUpperCase() === 'XLM' || code.toUpperCase() === 'NATIVE';
}

export function shortenAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}

export function toStroopString(amount: string | number): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  return Math.round(value * 10_000_000).toString();
}
