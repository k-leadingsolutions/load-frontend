package com.load.backend.pos;

import java.math.BigDecimal;

/**
 * Read-only projection of a POS invoice. {@code status == NOT_RECEIVED} means the
 * invoice does not exist yet (no fabricated totals); {@code READY} carries the
 * authoritative final total.
 */
public record PosInvoiceRecord(
    String externalInvoiceId,
    PosInvoiceStatus status,
    BigDecimal finalTotal
) {
    public enum PosInvoiceStatus {
        NOT_RECEIVED,
        READY
    }
}
