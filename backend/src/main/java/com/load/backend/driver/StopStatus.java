package com.load.backend.driver;

/**
 * Canonical Driver stop lifecycle - mirrors the frozen frontend's StopStatus.
 * Collection: ASSIGNED -> EN_ROUTE -> ARRIVED -> VERIFIED -> COLLECTED -> COMPLETED
 * Delivery:   ASSIGNED -> EN_ROUTE -> ARRIVED -> VERIFIED -> DELIVERED -> COMPLETED
 */
public enum StopStatus {
    ASSIGNED,
    EN_ROUTE,
    ARRIVED,
    VERIFIED,
    COLLECTED,
    DELIVERED,
    COMPLETED,
    FAILED,
    RESCHEDULE_REQUESTED
}
