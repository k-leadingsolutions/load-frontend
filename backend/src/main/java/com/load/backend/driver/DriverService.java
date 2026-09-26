package com.load.backend.driver;

import com.load.backend.common.exception.ForbiddenException;
import com.load.backend.common.exception.InvalidTransitionException;
import com.load.backend.common.exception.NotFoundException;
import com.load.backend.customer.CustomerProfile;
import com.load.backend.customer.CustomerProfileRepository;
import com.load.backend.notification.MobileNumberNormalizer;
import com.load.backend.notification.OtpDeliveryPort;
import com.load.backend.order.FulfilmentType;
import com.load.backend.order.Order;
import com.load.backend.order.OrderRepository;
import com.load.backend.order.OrderStatus;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Server-authoritative Driver stop transitions. A Driver may only access/act on
 * assignments belonging to them - ownership is derived from the authenticated
 * principal's linked {@link Driver} record, never a client-supplied driverId.
 */
@Service
public class DriverService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DriverAssignmentRepository assignmentRepository;
    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpDeliveryPort otpDeliveryPort;

    public DriverService(
        DriverAssignmentRepository assignmentRepository,
        DriverRepository driverRepository,
        OrderRepository orderRepository,
        CustomerProfileRepository customerProfileRepository,
        PasswordEncoder passwordEncoder,
        OtpDeliveryPort otpDeliveryPort
    ) {
        this.assignmentRepository = assignmentRepository;
        this.driverRepository = driverRepository;
        this.orderRepository = orderRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpDeliveryPort = otpDeliveryPort;
    }

    @Transactional(readOnly = true)
    public List<DriverAssignment> listMyAssignments(UUID driverUserId) {
        UUID driverId = resolveDriverId(driverUserId);
        return assignmentRepository.findByDriverId(driverId);
    }

    @Transactional
    public DriverAssignment startEnRoute(UUID driverUserId, UUID assignmentId) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireStatus(assignment, StopStatus.ASSIGNED);
        assignment.setStopStatus(StopStatus.EN_ROUTE);
        return assignmentRepository.save(assignment);
    }

    /**
     * Arrival generates a fresh OTP. Only the BCrypt hash is persisted; the
     * plaintext code is delivered to the customer's mobile number through
     * {@link OtpDeliveryPort} and is never returned to the Driver's API
     * response.
     */
    @Transactional
    public DriverAssignment confirmArrival(UUID driverUserId, UUID assignmentId) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireStatus(assignment, StopStatus.EN_ROUTE);

        String mobileNumber = resolveCustomerMobileNumber(assignment.getOrderId());
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        otpDeliveryPort.send(mobileNumber, otp);

        assignment.setVerificationMethod(VerificationMethod.OTP);
        assignment.setVerificationStatus(VerificationStatus.AWAITING);
        assignment.setVerificationCodeHash(passwordEncoder.encode(otp));
        assignment.setStopStatus(StopStatus.ARRIVED);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public DriverAssignment verify(UUID driverUserId, UUID assignmentId, String code) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireStatus(assignment, StopStatus.ARRIVED);

        if (assignment.getVerificationCodeHash() == null || !passwordEncoder.matches(code, assignment.getVerificationCodeHash())) {
            assignment.setVerificationStatus(VerificationStatus.INVALID);
            assignmentRepository.save(assignment);
            throw new InvalidTransitionException("VERIFICATION_FAILED", "The verification code is incorrect.");
        }

        assignment.setVerificationStatus(VerificationStatus.VERIFIED);
        assignment.setStopStatus(StopStatus.VERIFIED);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public DriverAssignment confirmCollection(UUID driverUserId, UUID assignmentId) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireStopType(assignment, StopType.PICKUP);
        requireVerified(assignment);
        assignment.setStopStatus(StopStatus.COLLECTED);
        return assignmentRepository.save(assignment);
    }

    /**
     * Confirming a DELIVERY stop is the terminal event for a DELIVERY order's
     * lifecycle - no separate Operations action exists (or should exist) after
     * the Driver has physically completed delivery. Without this, a DELIVERY
     * order could never reach {@code OrderStatus.COMPLETED}, unlike
     * STORE_COLLECTION orders which Operations explicitly completes.
     */
    @Transactional
    public DriverAssignment confirmDelivery(UUID driverUserId, UUID assignmentId) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireStopType(assignment, StopType.DELIVERY);
        requireVerified(assignment);
        assignment.setStopStatus(StopStatus.DELIVERED);
        DriverAssignment saved = assignmentRepository.save(assignment);
        completeDeliveryOrderIfEligible(assignment.getOrderId());
        return saved;
    }

    @Transactional
    public DriverAssignment reportFailure(UUID driverUserId, UUID assignmentId, RescheduleReason reason, String note) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireActiveNonTerminal(assignment);
        assignment.setFailureReason(reason);
        assignment.setFailureNote(note);
        assignment.setStopStatus(StopStatus.FAILED);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public DriverAssignment requestReschedule(UUID driverUserId, UUID assignmentId, RescheduleReason reason, String note) {
        DriverAssignment assignment = getOwnedAssignment(driverUserId, assignmentId);
        requireActiveNonTerminal(assignment);
        assignment.setRescheduleReason(reason);
        assignment.setRescheduleNote(note);
        assignment.setStopStatus(StopStatus.RESCHEDULE_REQUESTED);
        return assignmentRepository.save(assignment);
    }

    /** Resolves the mobile number to deliver an OTP to, server-side only - never client-supplied. */
    private String resolveCustomerMobileNumber(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found."));
        CustomerProfile profile = customerProfileRepository.findByUserId(order.getCustomerId())
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        return MobileNumberNormalizer.normalize(profile.getMobileNumber());
    }

    private void completeDeliveryOrderIfEligible(UUID orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order != null && order.getFulfilmentType() == FulfilmentType.DELIVERY && order.getStatus() == OrderStatus.OUT_FOR_DELIVERY) {
            order.setStatus(OrderStatus.COMPLETED);
            orderRepository.save(order);
        }
    }

    private UUID resolveDriverId(UUID driverUserId) {
        return driverRepository.findByUserId(driverUserId)
            .orElseThrow(() -> new NotFoundException("Driver profile not found."))
            .getId();
    }

    private DriverAssignment getOwnedAssignment(UUID driverUserId, UUID assignmentId) {
        UUID driverId = resolveDriverId(driverUserId);
        DriverAssignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new NotFoundException("Assignment not found."));

        if (!assignment.getDriverId().equals(driverId)) {
            throw new ForbiddenException("This assignment does not belong to you.");
        }
        return assignment;
    }

    private void requireStatus(DriverAssignment assignment, StopStatus expected) {
        if (assignment.getStopStatus() != expected) {
            throw new InvalidTransitionException(
                "INVALID_TRANSITION",
                "Cannot transition from " + assignment.getStopStatus() + "; expected " + expected + "."
            );
        }
    }

    private void requireStopType(DriverAssignment assignment, StopType expected) {
        if (assignment.getStopType() != expected) {
            throw new InvalidTransitionException("INVALID_STOP_TYPE", "This action does not apply to a " + assignment.getStopType() + " stop.");
        }
    }

    private void requireVerified(DriverAssignment assignment) {
        // Single source of truth is stopStatus, not verificationStatus alone.
        if (assignment.getStopStatus() != StopStatus.VERIFIED) {
            throw new InvalidTransitionException("NOT_VERIFIED", "This stop must be VERIFIED before it can be completed.");
        }
    }

    private void requireActiveNonTerminal(DriverAssignment assignment) {
        StopStatus status = assignment.getStopStatus();
        if (status == StopStatus.COLLECTED || status == StopStatus.DELIVERED
            || status == StopStatus.COMPLETED || status == StopStatus.FAILED) {
            throw new InvalidTransitionException("INVALID_TRANSITION", "Cannot act on a stop that is already " + status + ".");
        }
    }
}
