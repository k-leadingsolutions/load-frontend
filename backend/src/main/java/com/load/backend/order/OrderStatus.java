package com.load.backend.order;

/**
 * Operational status only. Deliberately independent from {@link PaymentStatus}
 * and {@link InvoiceStatus} - never combined into one status enum.
 */
public enum OrderStatus {
    BOOKING_RECEIVED,
    PICKUP_SCHEDULED,
    DRIVER_ASSIGNED,
    DRIVER_EN_ROUTE,
    DRIVER_ARRIVED,
    COLLECTION_VERIFIED,
    COLLECTED,
    WEIGHT_CONFIRMED,
    AWAITING_PAYMENT,
    PAYMENT_CONFIRMED,
    RECEIVED_AT_STORE,
    SORTING,
    WASHING,
    DRYING,
    IRONING,
    QUALITY_CHECK,
    PACKING,
    READY_FOR_DISPATCH,
    DELIVERY_SCHEDULED,
    OUT_FOR_DELIVERY,
    DELIVERED,
    COMPLETED,
    RESCHEDULED,
    CANCELLED
}
