package com.load.backend.order;

/**
 * NOT_REQUIRED - STORE_COLLECTION (paid at store) or invoice not yet available.
 * PENDING       - invoice READY and unpaid (DELIVERY only).
 * CONFIRMED     - paid.
 * FAILED        - last payment attempt failed.
 * REFUNDED      - refunded after payment.
 */
public enum PaymentStatus {
    NOT_REQUIRED,
    PENDING,
    CONFIRMED,
    FAILED,
    REFUNDED
}
