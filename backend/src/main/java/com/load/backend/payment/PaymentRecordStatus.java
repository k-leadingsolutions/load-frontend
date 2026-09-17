package com.load.backend.payment;

/** Status of an individual payment record/attempt (distinct from the order-level PaymentStatus projection). */
public enum PaymentRecordStatus {
    CONFIRMED,
    FAILED,
    REFUNDED
}
