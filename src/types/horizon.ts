import type { HorizonEventType } from '@prisma/client';

export interface NormalizedHorizonEvent {
  type: HorizonEventType;
  ledger: number;
  txHash: string;
  opIndex: number;
  sourceAccount: string;
  createdAt: string;
  raw: Record<string, unknown>;
}

export interface PaymentEventData {
  from: string;
  to: string;
  assetCode: string;
  assetIssuer: string | null;
  amount: string;
  memo?: string | null;
  memoType?: string | null;
}

export interface TrustlineEventData {
  account: string;
  assetCode: string;
  assetIssuer: string;
  limit: string;
  removed: boolean;
}

export interface AccountCreatedEventData {
  account: string;
  funder: string;
  startingBalance: string;
}

export interface AssetIssuanceEventData {
  issuer: string;
  assetCode: string;
  amount: string;
}

export interface OfferCreatedEventData {
  seller: string;
  sellingAssetCode: string;
  buyingAssetCode: string;
  amount: string;
  price: string;
}

export interface AccountMergeEventData {
  account: string;
  into: string;
}

export interface SignerChangeEventData {
  account: string;
  signerKey: string;
  weight: number;
}

export interface ThresholdChangeEventData {
  account: string;
  lowThreshold?: number;
  medThreshold?: number;
  highThreshold?: number;
}
