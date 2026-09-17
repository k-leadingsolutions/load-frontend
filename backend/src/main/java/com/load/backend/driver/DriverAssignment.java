package com.load.backend.driver;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * A single Driver stop/assignment. {@code driverId} and {@code orderId} are real
 * foreign keys (enforced at the database level - see Flyway migration), not
 * matched by arbitrary string identifiers.
 */
@Entity
@Table(name = "driver_assignments")
public class DriverAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "driver_id", nullable = false)
    private UUID driverId;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "stop_index", nullable = false)
    private int stopIndex;

    @Enumerated(EnumType.STRING)
    @Column(name = "stop_type", nullable = false, length = 16)
    private StopType stopType;

    @Enumerated(EnumType.STRING)
    @Column(name = "stop_status", nullable = false, length = 32)
    private StopStatus stopStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", length = 16)
    private VerificationMethod verificationMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 16)
    private VerificationStatus verificationStatus;

    /** BCrypt hash of the current OTP - never the plaintext code. */
    @Column(name = "verification_code_hash")
    private String verificationCodeHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_reason", length = 32)
    private RescheduleReason failureReason;

    @Column(name = "failure_note")
    private String failureNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "reschedule_reason", length = 32)
    private RescheduleReason rescheduleReason;

    @Column(name = "reschedule_note")
    private String rescheduleNote;

    @Column(name = "operations_decision", length = 16)
    private String operationsDecision;

    @Column(name = "operations_decision_note")
    private String operationsDecisionNote;

    @Column(name = "operations_decision_at")
    private Instant operationsDecisionAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    private long version;

    protected DriverAssignment() {
        // JPA
    }

    public DriverAssignment(UUID driverId, UUID orderId, int stopIndex, StopType stopType) {
        this.driverId = driverId;
        this.orderId = orderId;
        this.stopIndex = stopIndex;
        this.stopType = stopType;
        this.stopStatus = StopStatus.ASSIGNED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getDriverId() {
        return driverId;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public int getStopIndex() {
        return stopIndex;
    }

    public StopType getStopType() {
        return stopType;
    }

    public StopStatus getStopStatus() {
        return stopStatus;
    }

    public void setStopStatus(StopStatus stopStatus) {
        this.stopStatus = stopStatus;
        this.updatedAt = Instant.now();
    }

    public VerificationMethod getVerificationMethod() {
        return verificationMethod;
    }

    public void setVerificationMethod(VerificationMethod verificationMethod) {
        this.verificationMethod = verificationMethod;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getVerificationCodeHash() {
        return verificationCodeHash;
    }

    public void setVerificationCodeHash(String verificationCodeHash) {
        this.verificationCodeHash = verificationCodeHash;
    }

    public RescheduleReason getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(RescheduleReason failureReason) {
        this.failureReason = failureReason;
    }

    public String getFailureNote() {
        return failureNote;
    }

    public void setFailureNote(String failureNote) {
        this.failureNote = failureNote;
    }

    public RescheduleReason getRescheduleReason() {
        return rescheduleReason;
    }

    public void setRescheduleReason(RescheduleReason rescheduleReason) {
        this.rescheduleReason = rescheduleReason;
    }

    public String getRescheduleNote() {
        return rescheduleNote;
    }

    public void setRescheduleNote(String rescheduleNote) {
        this.rescheduleNote = rescheduleNote;
    }

    public String getOperationsDecision() {
        return operationsDecision;
    }

    public void setOperationsDecision(String operationsDecision) {
        this.operationsDecision = operationsDecision;
    }

    public String getOperationsDecisionNote() {
        return operationsDecisionNote;
    }

    public void setOperationsDecisionNote(String operationsDecisionNote) {
        this.operationsDecisionNote = operationsDecisionNote;
    }

    public Instant getOperationsDecisionAt() {
        return operationsDecisionAt;
    }

    public void setOperationsDecisionAt(Instant operationsDecisionAt) {
        this.operationsDecisionAt = operationsDecisionAt;
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
