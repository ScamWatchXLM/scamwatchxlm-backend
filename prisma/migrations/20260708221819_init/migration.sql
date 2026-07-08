-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('ACCOUNT', 'ASSET', 'ISSUER', 'TRANSACTION');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('DISCORD', 'SLACK', 'EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "HorizonEventType" AS ENUM ('ACCOUNT_CREATED', 'TRUSTLINE_CREATED', 'TRUSTLINE_REMOVED', 'PAYMENT', 'PATH_PAYMENT', 'ASSET_ISSUANCE', 'OFFER_CREATED', 'ACCOUNT_MERGE', 'SIGNER_CHANGE', 'THRESHOLD_CHANGE');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAtLedger" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "homeDomain" TEXT,
    "isFunded" BOOLEAN NOT NULL DEFAULT true,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'credit_alphanum4',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorizonEvent" (
    "id" TEXT NOT NULL,
    "type" "HorizonEventType" NOT NULL,
    "ledger" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "opIndex" INTEGER NOT NULL DEFAULT 0,
    "sourceAccountId" TEXT,
    "raw" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorizonEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScore" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "accountId" TEXT,
    "assetId" TEXT,
    "score" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "detector" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detection" (
    "id" TEXT NOT NULL,
    "detectorName" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "evidence" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Detection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "accountId" TEXT,
    "assetId" TEXT,
    "detectionId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterEmail" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "accountId" TEXT,
    "assetId" TEXT,
    "targetAddress" TEXT,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "target" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatsSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalAlerts" INTEGER NOT NULL,
    "totalReports" INTEGER NOT NULL,
    "totalDetections" INTEGER NOT NULL,
    "flaggedAccounts" INTEGER NOT NULL,
    "flaggedAssets" INTEGER NOT NULL,
    "bySeverity" JSONB NOT NULL,
    "byDetector" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_publicKey_key" ON "Account"("publicKey");

-- CreateIndex
CREATE INDEX "Account_isFlagged_idx" ON "Account"("isFlagged");

-- CreateIndex
CREATE INDEX "Account_firstSeenAt_idx" ON "Account"("firstSeenAt");

-- CreateIndex
CREATE INDEX "Asset_issuer_idx" ON "Asset"("issuer");

-- CreateIndex
CREATE INDEX "Asset_isFlagged_idx" ON "Asset"("isFlagged");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_issuer_key" ON "Asset"("code", "issuer");

-- CreateIndex
CREATE INDEX "HorizonEvent_type_idx" ON "HorizonEvent"("type");

-- CreateIndex
CREATE INDEX "HorizonEvent_ledger_idx" ON "HorizonEvent"("ledger");

-- CreateIndex
CREATE INDEX "HorizonEvent_createdAt_idx" ON "HorizonEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HorizonEvent_txHash_opIndex_key" ON "HorizonEvent"("txHash", "opIndex");

-- CreateIndex
CREATE INDEX "RiskScore_entityType_entityId_idx" ON "RiskScore"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RiskScore_createdAt_idx" ON "RiskScore"("createdAt");

-- CreateIndex
CREATE INDEX "RiskScore_severity_idx" ON "RiskScore"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Detection_dedupeKey_key" ON "Detection"("dedupeKey");

-- CreateIndex
CREATE INDEX "Detection_detectorName_idx" ON "Detection"("detectorName");

-- CreateIndex
CREATE INDEX "Detection_entityType_entityId_idx" ON "Detection"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Detection_createdAt_idx" ON "Detection"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_detectionId_key" ON "Alert"("detectionId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_entityType_entityId_idx" ON "Alert"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_accountId_idx" ON "Report"("accountId");

-- CreateIndex
CREATE INDEX "Report_assetId_idx" ON "Report"("assetId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_channel_idx" ON "Notification"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "StatsSnapshot_period_idx" ON "StatsSnapshot"("period");

-- CreateIndex
CREATE INDEX "StatsSnapshot_createdAt_idx" ON "StatsSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_issuer_fkey" FOREIGN KEY ("issuer") REFERENCES "Account"("publicKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorizonEvent" ADD CONSTRAINT "HorizonEvent_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "Detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
