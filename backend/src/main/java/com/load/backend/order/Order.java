package com.load.backend.order;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The single LOAD order aggregate. The backend is authoritative for all state
 * here - the frontend's separate LaundryOrder/ProductionOrder read models are
 * simply different projections of this one persisted entity.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfilment_type", nullable = false, length = 32)
    private FulfilmentType fulfilmentType;

    @Column(name = "pickup_address_id", nullable = false)
    private UUID pickupAddressId;

    @Column(name = "pickup_window_date", nullable = false)
    private String pickupWindowDate;

    @Column(name = "pickup_window_label", nullable = false)
    private String pickupWindowLabel;

    /** Present only when fulfilmentType == DELIVERY. Never populated for STORE_COLLECTION. */
    @Column(name = "delivery_address_id")
    private UUID deliveryAddressId;

    @Column(name = "delivery_window_date")
    private String deliveryWindowDate;

    @Column(name = "delivery_window_label")
    private String deliveryWindowLabel;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_service_selections", joinColumns = @JoinColumn(name = "order_id"))
    private List<OrderServiceSelection> services = new ArrayList<>();

    @Column(name = "estimated_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 32)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_status", nullable = false, length = 32)
    private InvoiceStatus invoiceStatus;

    /** Read-only projection of Invoice.finalTotal. Never independently calculated - never fabricated. */
    @Column(name = "final_invoice_total", precision = 12, scale = 2)
    private BigDecimal finalInvoiceTotal;

    @Column(name = "external_pos_order_id")
    private String externalPosOrderId;

    @Column(name = "external_invoice_id")
    private String externalInvoiceId;

    @Column(name = "received_at_store", nullable = false)
    private boolean receivedAtStore = false;

    /** Physically measured at store intake. Operational visibility only - never used to price the invoice. */
    @Column(name = "intake_weight_kg", precision = 8, scale = 3)
    private BigDecimal intakeWeightKg;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_intake_notes", joinColumns = @JoinColumn(name = "order_id"))
    @OrderColumn(name = "note_index")
    @Column(name = "note", length = 2000)
    private List<String> intakeNotes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private long version;

    protected Order() {
        // JPA
    }

    public Order(
        UUID customerId,
        FulfilmentType fulfilmentType,
        UUID pickupAddressId,
        String pickupWindowDate,
        String pickupWindowLabel,
        UUID deliveryAddressId,
        String deliveryWindowDate,
        String deliveryWindowLabel,
        List<OrderServiceSelection> services,
        BigDecimal estimatedTotal
    ) {
        this.customerId = customerId;
        this.status = OrderStatus.BOOKING_RECEIVED;
        this.fulfilmentType = fulfilmentType;
        this.pickupAddressId = pickupAddressId;
        this.pickupWindowDate = pickupWindowDate;
        this.pickupWindowLabel = pickupWindowLabel;
        this.deliveryAddressId = deliveryAddressId;
        this.deliveryWindowDate = deliveryWindowDate;
        this.deliveryWindowLabel = deliveryWindowLabel;
        this.services = new ArrayList<>(services);
        this.estimatedTotal = estimatedTotal;
        // A booking always succeeds independently of POS: invoice/payment start unresolved.
        this.invoiceStatus = InvoiceStatus.NOT_AVAILABLE;
        this.paymentStatus = PaymentStatus.NOT_REQUIRED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public FulfilmentType getFulfilmentType() {
        return fulfilmentType;
    }

    public UUID getPickupAddressId() {
        return pickupAddressId;
    }

    public String getPickupWindowDate() {
        return pickupWindowDate;
    }

    public String getPickupWindowLabel() {
        return pickupWindowLabel;
    }

    public UUID getDeliveryAddressId() {
        return deliveryAddressId;
    }

    public String getDeliveryWindowDate() {
        return deliveryWindowDate;
    }

    public String getDeliveryWindowLabel() {
        return deliveryWindowLabel;
    }

    public List<OrderServiceSelection> getServices() {
        return services;
    }

    public BigDecimal getEstimatedTotal() {
        return estimatedTotal;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
        this.updatedAt = Instant.now();
    }

    public InvoiceStatus getInvoiceStatus() {
        return invoiceStatus;
    }

    public void setInvoiceStatus(InvoiceStatus invoiceStatus) {
        this.invoiceStatus = invoiceStatus;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getFinalInvoiceTotal() {
        return finalInvoiceTotal;
    }

    public void setFinalInvoiceTotal(BigDecimal finalInvoiceTotal) {
        this.finalInvoiceTotal = finalInvoiceTotal;
    }

    public String getExternalPosOrderId() {
        return externalPosOrderId;
    }

    public void setExternalPosOrderId(String externalPosOrderId) {
        this.externalPosOrderId = externalPosOrderId;
    }

    public String getExternalInvoiceId() {
        return externalInvoiceId;
    }

    public void setExternalInvoiceId(String externalInvoiceId) {
        this.externalInvoiceId = externalInvoiceId;
    }

    public boolean isReceivedAtStore() {
        return receivedAtStore;
    }

    public void setReceivedAtStore(boolean receivedAtStore) {
        this.receivedAtStore = receivedAtStore;
        this.updatedAt = Instant.now();
    }

    public BigDecimal getIntakeWeightKg() {
        return intakeWeightKg;
    }

    public void setIntakeWeightKg(BigDecimal intakeWeightKg) {
        this.intakeWeightKg = intakeWeightKg;
    }

    public List<String> getIntakeNotes() {
        return intakeNotes;
    }

    public void addIntakeNote(String note) {
        // Most-recent-first, mirroring the frontend's intake note ordering.
        this.intakeNotes.add(0, note);
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public long getVersion() {
        return version;
    }
}
