package com.load.backend.driver;

public enum RescheduleReason {
    CUSTOMER_UNAVAILABLE,
    CUSTOMER_REQUESTED_NEW_TIME,
    INCORRECT_ADDRESS,
    ACCESS_ISSUE,
    PAYMENT_UNRESOLVED,
    OPERATIONAL_DELAY,
    OTHER
}
