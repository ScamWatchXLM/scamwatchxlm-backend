import { PrismaClient, Severity, UserRole } from '@prisma/client';

import { hashPassword } from '../src/utils/hash.js';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scamwatchxlm.dev' },
    update: {},
    create: {
      email: 'admin@scamwatchxlm.dev',
      passwordHash: await hashPassword('change-me-immediately'),
      role: UserRole.ADMIN,
    },
  });

  const scamAccount = await prisma.account.upsert({
    where: { publicKey: 'GA000000000000000000000000000000000000000000000SCAM' },
    update: {},
    create: {
      publicKey: 'GA000000000000000000000000000000000000000000000SCAM',
      isFlagged: true,
      metadata: { seed: true, note: 'Example flagged account for local development' },
    },
  });

  const scamAsset = await prisma.asset.upsert({
    where: { code_issuer: { code: 'SCAMXLM', issuer: scamAccount.publicKey } },
    update: {},
    create: {
      code: 'SCAMXLM',
      issuer: scamAccount.publicKey,
      isFlagged: true,
      metadata: { seed: true },
    },
  });

  const detection = await prisma.detection.upsert({
    where: { dedupeKey: 'seed:fake-asset-issuer:SCAMXLM' },
    update: {},
    create: {
      detectorName: 'fake-asset-issuer',
      entityType: 'ASSET',
      entityId: scamAsset.id,
      severity: Severity.CRITICAL,
      confidence: 0.95,
      reasons: [
        'Issuer impersonates a well-known asset code',
        'Issuer account created < 1 hour before issuance',
      ],
      dedupeKey: 'seed:fake-asset-issuer:SCAMXLM',
    },
  });

  await prisma.alert.upsert({
    where: { detectionId: detection.id },
    update: {},
    create: {
      title: 'Fake asset issuer detected: SCAMXLM',
      description: 'Newly created account issued an asset impersonating a known ticker.',
      severity: Severity.CRITICAL,
      entityType: 'ASSET',
      entityId: scamAsset.id,
      assetId: scamAsset.id,
      detectionId: detection.id,
    },
  });

  /* eslint-disable no-console */
  console.log(`Seeded admin user: ${admin.email}`);
  console.log(`Seeded example flagged account: ${scamAccount.publicKey}`);
  console.log(`Seeded example flagged asset: ${scamAsset.code}:${scamAsset.issuer}`);
  /* eslint-enable no-console */
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
