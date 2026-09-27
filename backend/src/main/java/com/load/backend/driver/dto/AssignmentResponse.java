package com.load.backend.driver.dto;

import com.load.backend.driver.DriverAssignment;
import com.load.backend.driver.RescheduleReason;
import com.load.backend.driver.StopStatus;
import com.load.backend.driver.StopType;
import com.load.backend.driver.VerificationMethod;
import com.load.backend.driver.VerificationStatus;
import java.util.UUID;

public record AssignmentResponse(
    UUID id,
    UUID driverId,
    UUID orderId,
    String orderNumber,
    int stopIndex,
    StopType stopType,
    StopStatus stopStatus,
    VerificationMethod verificationMethod,
    VerificationStatus verificationStatus,
    RescheduleReason failureReason,
    String failureNote,
    RescheduleReason rescheduleReason,
    String rescheduleNote,
    String operationsDecision
) {
    /**
     * Builds a response without the human-friendly order number, for call
     * sites that have not (yet) resolved the owning order. Prefer
     * {@link #from(DriverAssignment, String)} wherever the order number is
     * available.
     */
    public static AssignmentResponse from(DriverAssignment assignment) {
        return from(assignment, null);
    }

    public static AssignmentResponse from(DriverAssignment assignment, String orderNumber) {
        return new AssignmentResponse(
            assignment.getId(),
            assignment.getDriverId(),
            assignment.getOrderId(),
            orderNumber,
            assignment.getStopIndex(),
            assignment.getStopType(),
            assignment.getStopStatus(),
            assignment.getVerificationMethod(),
            assignment.getVerificationStatus(),
            assignment.getFailureReason(),
            assignment.getFailureNote(),
            assignment.getRescheduleReason(),
            assignment.getRescheduleNote(),
            assignment.getOperationsDecision()
        );
    }
}
