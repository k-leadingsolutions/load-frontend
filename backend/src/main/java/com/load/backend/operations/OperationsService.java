package com.load.backend.operations;

import com.load.backend.common.exception.InvalidTransitionException;
import com.load.backend.common.exception.NotFoundException;
import com.load.backend.driver.Driver;
import com.load.backend.driver.DriverAssignment;
import com.load.backend.driver.DriverAssignmentRepository;
import com.load.backend.driver.DriverRepository;
import com.load.backend.driver.StopStatus;
import com.load.backend.driver.StopType;
import com.load.backend.invoice.InvoiceService;
import com.load.backend.operations.dto.DashboardMetricResponse;
import com.load.backend.order.FulfilmentType;
import com.load.backend.order.Order;
import com.load.backend.order.OrderRepository;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.QuantityReviewStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Operations owns: store intake, production progression, Driver assignment,
 * reschedule decisions, failed-attempt handling, and dispatch initiation. All
 * transitions here are server-authoritative - invalid transitions are rejected.
 */
@Service
public class OperationsService {

    private final OrderRepository orderRepository;
    private final DriverRepository driverRepository;
    private final DriverAssignmentRepository assignmentRepository;
    private final ProductionTransitionPolicy transitionPolicy;
    private final DispatchEligibilityService dispatchEligibilityService;
    private final InvoiceService invoiceService;

    public OperationsService(
        OrderRepository orderRepository,
        DriverRepository driverRepository,
        DriverAssignmentRepository assignmentRepository,
        ProductionTransitionPolicy transitionPolicy,
        DispatchEligibilityService dispatchEligibilityService,
        InvoiceService invoiceService
    ) {
        this.orderRepository = orderRepository;
        this.driverRepository = driverRepository;
        this.assignmentRepository = assignmentRepository;
        this.transitionPolicy = transitionPolicy;
        this.dispatchEligibilityService = dispatchEligibilityService;
        this.invoiceService = invoiceService;
    }

    /** Best-effort refresh of the LOAD invoice projection from the read-only POS boundary. */
    @Transactional
    public Order refreshInvoice(UUID orderId) {
        getOrder(orderId); // validates existence with a consistent NotFoundException
        return invoiceService.refreshInvoice(orderId);
    }

    @Transactional(readOnly = true)
    public List<Order> listAllOrders() {
        return orderRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Order getOrder(UUID orderId) {
        return orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found."));
    }

    @Transactional
    public Order confirmLaundryReceived(UUID orderId) {
        Order order = getOrder(orderId);
        if (order.isReceivedAtStore()) {
            throw new InvalidTransitionException("ALREADY_RECEIVED", "This order has already been received at the store.");
        }
        order.setReceivedAtStore(true);
        order.setStatus(OrderStatus.RECEIVED_AT_STORE);
        return orderRepository.save(order);
    }

    /** Weight/notes are operational-only and never touch pricing/POS. */
    @Transactional
    public Order recordStoreIntake(UUID orderId, BigDecimal weightKg, String notes) {
        Order order = getOrder(orderId);
        if (!order.isReceivedAtStore()) {
            throw new InvalidTransitionException("NOT_RECEIVED", "Store intake can only be recorded after the order is received at the store.");
        }
        if (weightKg != null) {
            order.setIntakeWeightKg(weightKg);
        }
        if (notes != null && !notes.isBlank()) {
            order.addIntakeNote(notes);
        }
        return orderRepository.save(order);
    }

    @Transactional
    public Order advanceProductionStage(UUID orderId) {
        Order order = getOrder(orderId);
        if (!order.isReceivedAtStore()) {
            throw new InvalidTransitionException("NOT_RECEIVED", "Cannot advance production before store intake is confirmed.");
        }
        if (transitionPolicy.isFinalStage(order.getStatus())) {
            throw new InvalidTransitionException("ALREADY_READY", "This order is already at the final production stage.");
        }
        order.setStatus(transitionPolicy.nextStage(order.getStatus()));
        return orderRepository.save(order);
    }

    @Transactional
    public DriverAssignment assignDriver(UUID orderId, UUID driverId, StopType stopType) {
        Order order = getOrder(orderId);
        Driver driver = driverRepository.findById(driverId)
            .orElseThrow(() -> new NotFoundException("Driver not found."));

        int nextStopIndex = assignmentRepository.findByDriverId(driver.getId()).size() + 1;
        DriverAssignment assignment = new DriverAssignment(driver.getId(), order.getId(), nextStopIndex, stopType);
        assignmentRepository.save(assignment);

        if (order.getStatus() == OrderStatus.BOOKING_RECEIVED || order.getStatus() == OrderStatus.PICKUP_SCHEDULED) {
            order.setStatus(OrderStatus.DRIVER_ASSIGNED);
            orderRepository.save(order);
        }

        return assignment;
    }

    @Transactional
    public Order dispatchForDelivery(UUID orderId) {
        Order order = getOrder(orderId);

        if (order.getFulfilmentType() != FulfilmentType.DELIVERY) {
            throw new InvalidTransitionException("INVALID_FULFILMENT", "This order is not a DELIVERY fulfilment order.");
        }
        if (order.getStatus() != OrderStatus.READY_FOR_DISPATCH) {
            throw new InvalidTransitionException("INVALID_TRANSITION", "Order is not yet READY_FOR_DISPATCH.");
        }
        if (!dispatchEligibilityService.isEligibleForDelivery(order)) {
            throw new InvalidTransitionException("NOT_DISPATCH_ELIGIBLE",
                "Dispatch requires a READY invoice and CONFIRMED payment.");
        }

        order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        return orderRepository.save(order);
    }

    @Transactional
    public Order completeStoreCollection(UUID orderId) {
        Order order = getOrder(orderId);

        if (order.getFulfilmentType() != FulfilmentType.STORE_COLLECTION) {
            throw new InvalidTransitionException("INVALID_FULFILMENT", "This order is not a STORE_COLLECTION fulfilment order.");
        }
        if (order.getStatus() != OrderStatus.READY_FOR_DISPATCH) {
            throw new InvalidTransitionException("INVALID_TRANSITION", "Order is not yet READY_FOR_DISPATCH.");
        }
        if (!dispatchEligibilityService.isEligibleForStoreCollection(order)) {
            throw new InvalidTransitionException("NOT_DISPATCH_ELIGIBLE", "Store collection requires a READY invoice.");
        }

        order.setStatus(OrderStatus.COMPLETED);
        return orderRepository.save(order);
    }

    @Transactional
    public DriverAssignment retryFailedAttempt(UUID assignmentId) {
        DriverAssignment assignment = getAssignment(assignmentId);
        if (assignment.getStopStatus() != StopStatus.FAILED) {
            throw new InvalidTransitionException("INVALID_TRANSITION", "Only a FAILED assignment can be retried.");
        }
        // Failure history/context (failureReason/failureNote) is preserved, not erased.
        assignment.setStopStatus(StopStatus.ASSIGNED);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public DriverAssignment reviewRescheduleRequest(UUID assignmentId, String decision, String note) {
        DriverAssignment assignment = getAssignment(assignmentId);
        if (assignment.getStopStatus() != StopStatus.RESCHEDULE_REQUESTED) {
            throw new InvalidTransitionException("INVALID_TRANSITION", "This assignment has no pending reschedule request.");
        }
        assignment.setOperationsDecision(decision);
        assignment.setOperationsDecisionNote(note);
        assignment.setOperationsDecisionAt(java.time.Instant.now());
        // Either decision returns the Driver to a valid next state - never a self-approved state.
        assignment.setStopStatus(StopStatus.ASSIGNED);
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public Order updateQuantityReview(UUID orderId, QuantityReviewStatus status) {
        Order order = getOrder(orderId);
        order.setQuantityReviewStatus(status);
        return orderRepository.save(order);
    }

    @Transactional
    public Order addInternalNote(UUID orderId, String note) {
        Order order = getOrder(orderId);
        order.addInternalNote(note);
        return orderRepository.save(order);
    }

    /** Only valid from QUALITY_CHECK - a pass advances to PACKING, a fail returns to SORTING. */
    @Transactional
    public Order performQualityCheck(UUID orderId, boolean passed, String notes) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.QUALITY_CHECK) {
            throw new InvalidTransitionException("NOT_AWAITING_QC", "This order is not awaiting quality check.");
        }
        order.setStatus(passed ? OrderStatus.PACKING : OrderStatus.SORTING);
        if (notes != null && !notes.isBlank()) {
            order.addInternalNote(notes);
        }
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public List<DriverAssignment> listAllAssignments() {
        return assignmentRepository.findAll().stream()
            .sorted(Comparator.comparingInt(DriverAssignment::getStopIndex))
            .toList();
    }

    /**
     * Operational readiness only - deliberately excludes revenue/financial
     * figures, which remain an Admin/analytics concern outside Operations'
     * role boundary. `sla` is a best-effort completion-timeliness figure
     * derived from persisted order data (no separate delivery-telemetry
     * tracking exists yet), not a fabricated placeholder.
     */
    @Transactional(readOnly = true)
    public List<DashboardMetricResponse> getDashboardMetrics() {
        List<Order> orders = orderRepository.findAll();

        long activeOrders = orders.stream()
            .filter(order -> order.getStatus() != OrderStatus.COMPLETED && order.getStatus() != OrderStatus.CANCELLED)
            .count();
        long inProduction = orders.stream()
            .filter(order -> transitionPolicy.isProductionStage(order.getStatus()))
            .count();

        List<Order> completedOrders = orders.stream()
            .filter(order -> order.getStatus() == OrderStatus.COMPLETED)
            .toList();

        String slaValue;
        String slaChangeLabel;
        if (completedOrders.isEmpty()) {
            slaValue = "N/A";
            slaChangeLabel = "No completed orders yet";
        } else {
            long onTime = completedOrders.stream().filter(this::completedOnTime).count();
            double percentage = (onTime * 100.0) / completedOrders.size();
            slaValue = String.format("%.1f%%", percentage);
            slaChangeLabel = "Based on " + completedOrders.size() + " completed order" + (completedOrders.size() == 1 ? "" : "s");
        }

        return List.of(
            new DashboardMetricResponse("orders", "Active orders", String.valueOf(activeOrders), inProduction + " in production"),
            new DashboardMetricResponse("sla", "On-time delivery", slaValue, slaChangeLabel)
        );
    }

    private boolean completedOnTime(Order order) {
        if (order.getFulfilmentType() == FulfilmentType.STORE_COLLECTION) {
            return true;
        }
        String targetDate = order.getDeliveryWindowDate();
        if (targetDate == null) {
            return true;
        }
        try {
            LocalDate target = LocalDate.parse(targetDate);
            LocalDate completedDate = order.getUpdatedAt().atZone(ZoneOffset.UTC).toLocalDate();
            return !completedDate.isAfter(target);
        } catch (DateTimeParseException ex) {
            return true;
        }
    }

    private DriverAssignment getAssignment(UUID assignmentId) {
        return assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new NotFoundException("Assignment not found."));
    }
}
