import { Horizon } from '@stellar/stellar-sdk';

import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import type { NormalizedHorizonEvent } from '../types/horizon.js';

const log = childLogger('horizon-monitor');

export type OperationHandler = (event: NormalizedHorizonEvent) => Promise<void>;

/**
 * Streams operations from Horizon in near-real-time and normalizes them into
 * the shape the detection pipeline expects. Falls back to polling on stream
 * errors (Horizon SSE streams occasionally drop silently).
 */
export class HorizonMonitorService {
  private readonly server: Horizon.Server;
  private closeStream: (() => void) | null = null;
  private cursor = 'now';

  constructor(private readonly onEvent: OperationHandler) {
    this.server = new Horizon.Server(env.HORIZON_URL, {
      allowHttp: env.HORIZON_URL.startsWith('http://'),
    });
  }

  start(): void {
    this.streamOperations();
  }

  stop(): void {
    this.closeStream?.();
    this.closeStream = null;
  }

  private streamOperations(): void {
    log.info({ cursor: this.cursor }, 'Starting Horizon operations stream');

    this.closeStream = this.server
      .operations()
      .cursor(this.cursor)
      .order('asc')
      .stream({
        // The SDK's stream() typings reuse the collection-page response type even though it
        // streams individual records at runtime — cast to the true per-message record shape.
        onmessage: (message) => {
          const record = message as unknown as Horizon.ServerApi.OperationRecord;
          this.cursor = record.paging_token;
          this.handleOperationRecord(record).catch((err) => {
            log.error({ err, opId: record.id }, 'Failed to process operation');
          });
        },
        onerror: (err) => {
          log.error({ err }, 'Horizon stream error, reconnecting shortly');
          this.closeStream?.();
          setTimeout(() => this.streamOperations(), env.HORIZON_STREAM_RETRY_MS);
        },
      });
  }

  private async handleOperationRecord(op: Horizon.ServerApi.OperationRecord): Promise<void> {
    const event = normalizeOperation(op);
    if (!event) return;
    await this.onEvent(event);
  }
}

/** Stellar operation IDs are TotalOrderIDs: ledger sequence in the top 32 bits, tx index next 20, op index low 12. */
function ledgerSequenceFromOperationId(id: string): number {
  return Number(BigInt(id) >> 32n);
}

/** Maps a raw Horizon operation record onto our normalized event shape, or null if we don't track this operation type. */
export function normalizeOperation(
  op: Horizon.ServerApi.OperationRecord,
): NormalizedHorizonEvent | null {
  const base = {
    ledger: ledgerSequenceFromOperationId(op.id),
    txHash: op.transaction_hash,
    opIndex: Number(BigInt(op.id) & 0xfffn),
    sourceAccount: op.source_account,
    createdAt: op.created_at,
  };

  // `op` is loosely typed here because Horizon's operation payload shape
  // varies by `type` far more than the SDK's TS definitions capture.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = op as unknown as Record<string, any>;

  switch (raw.type) {
    case 'create_account':
      return {
        ...base,
        type: 'ACCOUNT_CREATED',
        raw: { account: raw.account, funder: raw.funder, startingBalance: raw.starting_balance },
      };

    case 'payment': {
      const isIssuance = raw.asset_type !== 'native' && raw.from === raw.asset_issuer;
      return {
        ...base,
        type: isIssuance ? 'ASSET_ISSUANCE' : 'PAYMENT',
        raw: isIssuance
          ? { issuer: raw.from, assetCode: raw.asset_code, amount: raw.amount }
          : {
              from: raw.from,
              to: raw.to,
              assetCode: raw.asset_type === 'native' ? 'XLM' : raw.asset_code,
              assetIssuer: raw.asset_type === 'native' ? null : raw.asset_issuer,
              amount: raw.amount,
              memo: raw.transaction_attr?.memo ?? null,
              memoType: raw.transaction_attr?.memo_type ?? null,
            },
      };
    }

    case 'path_payment_strict_send':
    case 'path_payment_strict_receive':
      return {
        ...base,
        type: 'PATH_PAYMENT',
        raw: {
          from: raw.from,
          to: raw.to,
          assetCode: raw.asset_type === 'native' ? 'XLM' : raw.asset_code,
          assetIssuer: raw.asset_type === 'native' ? null : raw.asset_issuer,
          amount: raw.amount,
          memo: raw.transaction_attr?.memo ?? null,
          memoType: raw.transaction_attr?.memo_type ?? null,
        },
      };

    case 'change_trust':
      return {
        ...base,
        type: raw.limit === '0' ? 'TRUSTLINE_REMOVED' : 'TRUSTLINE_CREATED',
        raw: {
          account: raw.trustor ?? raw.source_account,
          assetCode: raw.asset_code,
          assetIssuer: raw.asset_issuer,
          limit: raw.limit,
          removed: raw.limit === '0',
        },
      };

    case 'manage_sell_offer':
    case 'manage_buy_offer':
    case 'create_passive_sell_offer':
      return {
        ...base,
        type: 'OFFER_CREATED',
        raw: {
          seller: raw.source_account,
          sellingAssetCode: raw.selling_asset_type === 'native' ? 'XLM' : raw.selling_asset_code,
          buyingAssetCode: raw.buying_asset_type === 'native' ? 'XLM' : raw.buying_asset_code,
          amount: raw.amount,
          price: raw.price,
        },
      };

    case 'account_merge':
      return {
        ...base,
        type: 'ACCOUNT_MERGE',
        raw: { account: raw.source_account, into: raw.into },
      };

    case 'set_options': {
      const isSignerChange = raw.signer_key != null;
      const isThresholdChange =
        raw.low_threshold != null || raw.med_threshold != null || raw.high_threshold != null;
      if (!isSignerChange && !isThresholdChange) return null;
      return {
        ...base,
        type: isSignerChange ? 'SIGNER_CHANGE' : 'THRESHOLD_CHANGE',
        raw: isSignerChange
          ? { account: raw.source_account, signerKey: raw.signer_key, weight: raw.signer_weight }
          : {
              account: raw.source_account,
              lowThreshold: raw.low_threshold,
              medThreshold: raw.med_threshold,
              highThreshold: raw.high_threshold,
            },
      };
    }

    default:
      return null;
  }
}
