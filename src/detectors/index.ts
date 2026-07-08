import { AssetImpersonationDetector } from './assetImpersonation.detector.js';
import { DetectorRegistry } from './base/DetectorRegistry.js';
import { CoordinatedTransfersDetector } from './coordinatedTransfers.detector.js';
import { DustAttackDetector } from './dustAttack.detector.js';
import { FakeAssetIssuerDetector } from './fakeAssetIssuer.detector.js';
import { HighVolumeCampaignDetector } from './highVolumeCampaign.detector.js';
import { MemoSpamDetector } from './memoSpam.detector.js';
import { RapidAccountCreationDetector } from './rapidAccountCreation.detector.js';
import { RapidTrustlineDetector } from './rapidTrustline.detector.js';
import { SpamPaymentDetector } from './spamPayment.detector.js';
import { SuspiciousIssuerDetector } from './suspiciousIssuer.detector.js';

export * from './base/Detector.js';
export * from './base/DetectorRegistry.js';

export function createDetectorRegistry(): DetectorRegistry {
  return new DetectorRegistry().registerAll([
    new FakeAssetIssuerDetector(),
    new AssetImpersonationDetector(),
    new DustAttackDetector(),
    new SpamPaymentDetector(),
    new MemoSpamDetector(),
    new RapidTrustlineDetector(),
    new SuspiciousIssuerDetector(),
    new HighVolumeCampaignDetector(),
    new RapidAccountCreationDetector(),
    new CoordinatedTransfersDetector(),
  ]);
}

export const detectorRegistry = createDetectorRegistry();
