export type AlertLevel =
  | "VALID"
  | "EXPIRING_12_MONTHS"
  | "EXPIRING_6_MONTHS"
  | "EXPIRING_3_MONTHS"
  | "EXPIRED";

export type AlertPresentation = {
  level: AlertLevel;
  label: string;
  tone: "green" | "yellow" | "orange" | "red" | "expired";
};

const PRESENTATION: Record<AlertLevel, AlertPresentation> = {
  VALID: { level: "VALID", label: "Valid", tone: "green" },
  EXPIRING_12_MONTHS: {
    level: "EXPIRING_12_MONTHS",
    label: "Expiring within 12 months",
    tone: "yellow",
  },
  EXPIRING_6_MONTHS: {
    level: "EXPIRING_6_MONTHS",
    label: "Expiring within 6 months",
    tone: "orange",
  },
  EXPIRING_3_MONTHS: {
    level: "EXPIRING_3_MONTHS",
    label: "Expiring within 3 months",
    tone: "red",
  },
  EXPIRED: { level: "EXPIRED", label: "Expired", tone: "expired" },
};

/**
 * Alert levels are computed from the expiry date at read time.
 * They are never stored in the database.
 */
export function getImmigrationAlertLevel(
  expiryDate: Date,
  from: Date = new Date(),
): AlertLevel {
  const fromUtc = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const expiryUtc = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const daysRemaining = Math.round((expiryUtc - fromUtc) / 86_400_000);

  if (daysRemaining < 0) return "EXPIRED";
  if (daysRemaining <= 90) return "EXPIRING_3_MONTHS";
  if (daysRemaining <= 180) return "EXPIRING_6_MONTHS";
  if (daysRemaining <= 365) return "EXPIRING_12_MONTHS";
  return "VALID";
}

export function getAlertPresentation(
  expiryDate: Date,
  from?: Date,
): AlertPresentation & { daysRemaining: number } {
  const fromDate = from ?? new Date();
  const fromUtc = Date.UTC(
    fromDate.getUTCFullYear(),
    fromDate.getUTCMonth(),
    fromDate.getUTCDate(),
  );
  const expiryUtc = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const daysRemaining = Math.round((expiryUtc - fromUtc) / 86_400_000);
  const level = getImmigrationAlertLevel(expiryDate, fromDate);
  return { ...PRESENTATION[level], daysRemaining };
}

export function alertSortRank(level: AlertLevel): number {
  switch (level) {
    case "EXPIRED":
      return 0;
    case "EXPIRING_3_MONTHS":
      return 1;
    case "EXPIRING_6_MONTHS":
      return 2;
    case "EXPIRING_12_MONTHS":
      return 3;
    default:
      return 4;
  }
}
