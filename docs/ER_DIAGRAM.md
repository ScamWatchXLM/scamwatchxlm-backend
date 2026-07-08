# Entity-Relationship Diagram

Source of truth is `prisma/schema.prisma`. This is a readable rendering of the same model.

```mermaid
erDiagram
    User ||--o{ ApiKey : owns
    User ||--o{ Report : submits
    User ||--o{ Report : reviews

    Account ||--o{ RiskScore : "risk history"
    Account ||--o{ Alert : "raised for"
    Account ||--o{ Report : "reported as"
    Account ||--o{ HorizonEvent : "source of"
    Account ||--o{ Asset : issues

    Asset ||--o{ RiskScore : "risk history"
    Asset ||--o{ Alert : "raised for"
    Asset ||--o{ Report : "reported as"

    Detection ||--o| Alert : "escalates to"

    Alert ||--o{ Notification : "delivered via"

    User {
      string id PK
      string email UK
      string passwordHash
      UserRole role
      boolean isActive
    }

    ApiKey {
      string id PK
      string userId FK
      string keyHash UK
      string keyPrefix
      string[] scopes
      boolean isActive
      datetime expiresAt
    }

    Account {
      string id PK
      string publicKey UK
      datetime firstSeenAt
      datetime lastSeenAt
      boolean isFlagged
      json metadata
    }

    Asset {
      string id PK
      string code
      string issuer FK
      boolean isFlagged
      json metadata
    }

    HorizonEvent {
      string id PK
      HorizonEventType type
      int ledger
      string txHash
      int opIndex
      string sourceAccountId FK
      json raw
    }

    RiskScore {
      string id PK
      EntityType entityType
      string entityId
      int score
      Severity severity
      float confidence
      json reasons
      string detector
    }

    Detection {
      string id PK
      string detectorName
      EntityType entityType
      string entityId
      Severity severity
      float confidence
      json reasons
      json evidence
      string dedupeKey UK
    }

    Alert {
      string id PK
      string title
      string description
      Severity severity
      AlertStatus status
      EntityType entityType
      string entityId
      string accountId FK
      string assetId FK
      string detectionId FK
    }

    Notification {
      string id PK
      string alertId FK
      NotificationChannel channel
      string target
      NotificationStatus status
      int attempts
    }

    Report {
      string id PK
      string reporterId FK
      string category
      string description
      string[] evidenceUrls
      ReportStatus status
      string accountId FK
      string assetId FK
      string targetAddress
      string reviewedById FK
    }

    StatsSnapshot {
      string id PK
      string period
      int totalAlerts
      int totalReports
      int totalDetections
      json bySeverity
      json byDetector
    }
```

## Notes

- `HorizonEvent.raw` stores the normalized, type-specific event payload (see `src/types/horizon.ts`) as JSON — detectors query it with Prisma's JSON path filters rather than requiring a column per operation type.
- `Detection.dedupeKey` is a detector-defined natural key (e.g. `dust-attack:<account>:<time-bucket>`) that prevents the same underlying fact from generating duplicate detections/alerts as events are reprocessed.
- `Alert` links back to at most one `Detection` (`detectionId` is unique) but an entity can accumulate many `Detection`s before/after an alert exists — `RiskScore` history is the append-only ledger of every score computed over time, independent of alerting.
