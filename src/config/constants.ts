export const SEVERITY_WEIGHTS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

export const RISK_SCORE_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
} as const;

export const QUEUE_NAMES = {
  HORIZON_EVENTS: 'horizon-events',
  DETECTION: 'detection',
  RISK_RECALCULATION: 'risk-recalculation',
  ALERT_CLEANUP: 'alert-cleanup',
  STATISTICS_GENERATION: 'statistics-generation',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
} as const;

export const WEBSOCKET_TOPICS = {
  ALERTS: 'alerts',
  DETECTIONS: 'detections',
  NETWORK_ACTIVITY: 'network-activity',
} as const;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const KNOWN_ASSET_CODES = ['XLM', 'USDC', 'yUSDC', 'AQUA', 'yXLM', 'BTC', 'ETH'] as const;

export const NEW_ACCOUNT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const RAPID_TRUSTLINE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const RAPID_TRUSTLINE_THRESHOLD = 5;
export const RAPID_ACCOUNT_CREATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const RAPID_ACCOUNT_CREATION_THRESHOLD = 10;
export const DUST_PAYMENT_MAX_AMOUNT = 0.0001;
export const SPAM_PAYMENT_WINDOW_MS = 10 * 60 * 1000;
export const SPAM_PAYMENT_THRESHOLD = 20;
export const MEMO_SPAM_REPEAT_THRESHOLD = 8;
export const LARGE_TRANSFER_AMOUNT = 50_000;
export const COORDINATED_TRANSFER_WINDOW_MS = 15 * 60 * 1000;
export const COORDINATED_TRANSFER_MIN_PARTICIPANTS = 4;

/** Detections older than this no longer count towards a flagged entity's live risk score. */
export const RISK_DECAY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
