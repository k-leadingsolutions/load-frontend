package com.load.backend.operations;

import com.load.backend.driver.DriverAssignment;
import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.operations.dto.AssignDriverRequest;
import com.load.backend.operations.dto.DashboardMetricResponse;
import com.load.backend.operations.dto.InternalNoteRequest;
import com.load.backend.operations.dto.QualityCheckRequest;
import com.load.backend.operations.dto.QuantityReviewRequest;
import com.load.backend.operations.dto.RescheduleDecisionRequest;
import com.load.backend.operations.dto.StoreIntakeRequest;
import com.load.backend.order.Order;
import com.load.backend.order.dto.OrderResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** OPERATIONS/ADMIN endpoints. No POS mutation capability exists anywhere in this controller/service. */
@RestController
@RequestMapping("/api/operations")
public class OperationsController {

    private final OperationsService operationsService;

    public OperationsController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> listOrders() {
        return ResponseEntity.ok(operationsService.listAllOrders().stream().map(OrderResponse::from).toList());
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.getOrder(orderId)));
    }

    @GetMapping("/metrics")
    public ResponseEntity<List<DashboardMetricResponse>> getMetrics() {
        return ResponseEntity.ok(operationsService.getDashboardMetrics());
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<AssignmentResponse>> listAssignments() {
        return ResponseEntity.ok(operationsService.listAllAssignments().stream().map(AssignmentResponse::from).toList());
    }

    @PostMapping("/orders/{orderId}/store-received")
    public ResponseEntity<OrderResponse> confirmLaundryReceived(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.confirmLaundryReceived(orderId)));
    }

    @PostMapping("/orders/{orderId}/refresh-invoice")
    public ResponseEntity<OrderResponse> refreshInvoice(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.refreshInvoice(orderId)));
    }

    @PostMapping("/orders/{orderId}/store-intake")
    public ResponseEntity<OrderResponse> recordStoreIntake(@PathVariable UUID orderId, @RequestBody StoreIntakeRequest request) {
        Order order = operationsService.recordStoreIntake(orderId, request.weightKg(), request.notes());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/orders/{orderId}/quantity-review")
    public ResponseEntity<OrderResponse> updateQuantityReview(@PathVariable UUID orderId, @Valid @RequestBody QuantityReviewRequest request) {
        Order order = operationsService.updateQuantityReview(orderId, request.status());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/orders/{orderId}/notes")
    public ResponseEntity<OrderResponse> addInternalNote(@PathVariable UUID orderId, @Valid @RequestBody InternalNoteRequest request) {
        Order order = operationsService.addInternalNote(orderId, request.note());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/orders/{orderId}/quality-check")
    public ResponseEntity<OrderResponse> performQualityCheck(@PathVariable UUID orderId, @Valid @RequestBody QualityCheckRequest request) {
        Order order = operationsService.performQualityCheck(orderId, request.passed(), request.notes());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/orders/{orderId}/advance-production")
    public ResponseEntity<OrderResponse> advanceProductionStage(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.advanceProductionStage(orderId)));
    }

    @PostMapping("/orders/{orderId}/assign-driver")
    public ResponseEntity<AssignmentResponse> assignDriver(@PathVariable UUID orderId, @Valid @RequestBody AssignDriverRequest request) {
        DriverAssignment assignment = operationsService.assignDriver(orderId, request.driverId(), request.stopType());
        return ResponseEntity.ok(AssignmentResponse.from(assignment));
    }

    @PostMapping("/orders/{orderId}/dispatch")
    public ResponseEntity<OrderResponse> dispatchForDelivery(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.dispatchForDelivery(orderId)));
    }

    @PostMapping("/orders/{orderId}/complete-store-collection")
    public ResponseEntity<OrderResponse> completeStoreCollection(@PathVariable UUID orderId) {
        return ResponseEntity.ok(OrderResponse.from(operationsService.completeStoreCollection(orderId)));
    }

    @PostMapping("/assignments/{assignmentId}/retry")
    public ResponseEntity<AssignmentResponse> retryFailedAttempt(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponse.from(operationsService.retryFailedAttempt(assignmentId)));
    }

    @PostMapping("/assignments/{assignmentId}/reschedule-decision")
    public ResponseEntity<AssignmentResponse> reviewReschedule(@PathVariable UUID assignmentId, @Valid @RequestBody RescheduleDecisionRequest request) {
        DriverAssignment assignment = operationsService.reviewRescheduleRequest(assignmentId, request.decision(), request.note());
        return ResponseEntity.ok(AssignmentResponse.from(assignment));
    }
}
