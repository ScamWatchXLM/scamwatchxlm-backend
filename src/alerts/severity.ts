import { Severity } from '@prisma/client';

const ORDER: Record<Severity, number> = {
  [Severity.LOW]: 0,
  [Severity.MEDIUM]: 1,
  [Severity.HIGH]: 2,
  [Severity.CRITICAL]: 3,
};

export function isAtLeast(severity: Severity, threshold: Severity): boolean {
  return ORDER[severity] >= ORDER[threshold];
}

export function maxSeverity(a: Severity, b: Severity): Severity {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function parseSeverity(value: string): Severity | null {
  const upper = value.toUpperCase();
  return (Object.values(Severity) as string[]).includes(upper) ? (upper as Severity) : null;
}
