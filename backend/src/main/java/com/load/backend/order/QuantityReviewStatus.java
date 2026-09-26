package com.load.backend.order;

/**
 * Operations' physical-quantity review outcome for an order's intake. Entirely
 * separate from pricing/invoicing — never used to adjust the commercial total.
 */
public enum QuantityReviewStatus {
    PENDING,
    CONFIRMED,
    ADJUSTED
}
