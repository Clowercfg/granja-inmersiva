/**
 * Centralized affiliate configuration.
 * All rates are stored as decimals (1% = 0.01).
 * These rates are SNAPSHOT-FROZEN per transaction — changing here only affects NEW commissions.
 */
export const AFFILIATE_CONFIG = {
  rates: {
    level1: 0.01,
    level2: 0.008,
    level3: 0.004,
    level4Plus: 0.0005,
  },

  maxDepth: 10,

  /**
   * Returns the commission rate for a given ancestor level (1-indexed).
   */
  getRate(level) {
    if (level === 1) return this.rates.level1;
    if (level === 2) return this.rates.level2;
    if (level === 3) return this.rates.level3;
    return this.rates.level4Plus;
  },

  /**
   * Max amount of USD profit per single event to consider eligible.
   * Set to Infinity for no cap.
   */
  maxEligibleProfitPerEvent: Infinity,

  /** Commission status lifecycle */
  STATUS: {
    PENDING: "pending",
    AVAILABLE: "available",
    REVERSED: "reversed",
    CANCELLED: "cancelled",
  },

  /** Affiliate account status */
  ACCOUNT_STATUS: {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    CLOSED: "closed",
  },

  /** How many decimal places for USD amounts */
  USD_DECIMALS: 2,

  /** How many decimal places for intermediate calculations */
  CALC_DECIMALS: 8,
};
