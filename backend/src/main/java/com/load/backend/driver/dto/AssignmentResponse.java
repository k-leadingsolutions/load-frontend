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
    public static AssignmentResponse from(DriverAssignment assignment) {
        return new AssignmentResponse(
            assignment.getId(),
            assignment.getDriverId(),
            assignment.getOrderId(),
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
