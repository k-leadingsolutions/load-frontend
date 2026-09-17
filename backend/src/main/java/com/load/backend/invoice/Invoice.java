package com.load.backend.invoice;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * LOAD-side persisted projection of the POS invoice for a given order. This is
 * never independently priced - it only ever mirrors what the read-only POS
 * boundary reports, refreshed on demand.
 */
@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Column(name = "external_invoice_id")
    private String externalInvoiceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private InvoiceProjectionStatus status;

    @Column(name = "final_total", precision = 12, scale = 2)
    private BigDecimal finalTotal;

    @Column(name = "retrieved_at", nullable = false)
    private Instant retrievedAt = Instant.now();

    @Version
    private long version;

    protected Invoice() {
        // JPA
    }

    public Invoice(UUID orderId, String externalInvoiceId, InvoiceProjectionStatus status, BigDecimal finalTotal) {
        this.orderId = orderId;
        this.externalInvoiceId = externalInvoiceId;
        this.status = status;
        this.finalTotal = finalTotal;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getExternalInvoiceId() {
        return externalInvoiceId;
    }

    public InvoiceProjectionStatus getStatus() {
        return status;
    }

    public BigDecimal getFinalTotal() {
        return finalTotal;
    }

    public Instant getRetrievedAt() {
        return retrievedAt;
    }

    public void update(String externalInvoiceId, InvoiceProjectionStatus status, BigDecimal finalTotal) {
        this.externalInvoiceId = externalInvoiceId;
        this.status = status;
        this.finalTotal = finalTotal;
        this.retrievedAt = Instant.now();
    }
}
