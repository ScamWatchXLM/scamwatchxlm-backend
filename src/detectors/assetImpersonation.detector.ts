import { Severity } from '@prisma/client';

import { KNOWN_ASSET_CODES } from '../config/constants.js';
import type { AssetIssuanceEventData, NormalizedHorizonEvent } from '../types/horizon.js';
import type { DetectionResult } from '../types/risk.js';

import { BaseDetector, type DetectorContext } from './base/Detector.js';

/** Well-known issuers we trust for a given asset code, keyed uppercase. Extend as verified issuers are curated. */
const TRUSTED_ISSUERS: Record<string, Set<string>> = {};

function isLookalike(code: string, known: string): boolean {
  const a = code.toUpperCase();
  const b = known.toUpperCase();
  if (a === b) return true;
  // Cheap Levenshtein-ish check: same length, off by one or two characters (e.g. USDC vs USDT-style swaps).
  if (Math.abs(a.length - b.length) > 1) return false;
  let mismatches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) mismatches++;
  }
  mismatches += Math.abs(a.length - b.length);
  return mismatches <= 1 && a !== b;
}

/**
 * Flags assets whose code exactly matches (or closely mimics) a well-known
 * ticker while being issued from an untrusted issuer account — classic
 * impersonation of USDC, AQUA, etc.
 */
export class AssetImpersonationDetector extends BaseDetector {
  readonly name = 'asset-impersonation';
  readonly description =
    'Detects assets impersonating well-known tickers via an unverified issuer.';
  readonly appliesTo = ['ASSET_ISSUANCE'] as const;

  async detect(event: NormalizedHorizonEvent, _ctx: DetectorContext): Promise<DetectionResult[]> {
    const data = event.raw as unknown as AssetIssuanceEventData;
    const detections: DetectionResult[] = [];

    for (const known of KNOWN_ASSET_CODES) {
      const exact = data.assetCode.toUpperCase() === known.toUpperCase();
      const lookalike = !exact && isLookalike(data.assetCode, known);
      if (!exact && !lookalike) continue;

      const trusted = TRUSTED_ISSUERS[known.toUpperCase()]?.has(data.issuer) ?? false;
      if (trusted) continue;

      detections.push({
        detectorName: this.name,
        entityType: 'ASSET',
        entityId: `${data.assetCode}:${data.issuer}`,
        dedupeKey: this.dedupeKey(data.assetCode, data.issuer, known),
        severity: exact ? Severity.CRITICAL : Severity.HIGH,
        confidence: exact ? 0.85 : 0.6,
        reasons: [
          {
            code: exact ? 'EXACT_TICKER_MATCH' : 'LOOKALIKE_TICKER',
            message: exact
              ? `Asset code "${data.assetCode}" matches known ticker "${known}" but is issued by an unverified account`
              : `Asset code "${data.assetCode}" closely resembles known ticker "${known}"`,
            weight: exact ? 0.8 : 0.5,
          },
        ],
        evidence: { txHash: event.txHash, ledger: event.ledger, matchedTicker: known },
      });
    }

    return detections;
  }
}
