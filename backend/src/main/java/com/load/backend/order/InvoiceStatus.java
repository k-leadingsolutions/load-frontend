package com.load.backend.order;

/**
 * Invoice lifecycle, projected read-only from the POS boundary. A LOAD booking
 * is always valid with NOT_AVAILABLE - the invoice becomes READY only once the
 * store-side POS transaction is finalised and retrieved.
 */
public enum InvoiceStatus {
    NOT_AVAILABLE,
    READY
}
