package com.load.backend.order;

/** Mirrors the frozen frontend's FulfilmentType. LOAD always collects the first leg from the Customer. */
public enum FulfilmentType {
    DELIVERY,
    STORE_COLLECTION
}
