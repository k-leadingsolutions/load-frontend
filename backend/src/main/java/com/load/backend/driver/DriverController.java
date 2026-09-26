package com.load.backend.driver;

import com.load.backend.common.security.CurrentUser;
import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.driver.dto.ReasonNoteRequest;
import com.load.backend.driver.dto.VerifyRequest;
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

/** DRIVER-only endpoints. A Driver can only ever act on assignments assigned to them. */
@RestController
@RequestMapping("/api/driver/assignments")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> listMine() {
        List<AssignmentResponse> responses = driverService.listMyAssignments(CurrentUser.userId()).stream()
            .map(AssignmentResponse::from)
            .toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{assignmentId}/en-route")
    public ResponseEntity<AssignmentResponse> startEnRoute(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponse.from(driverService.startEnRoute(CurrentUser.userId(), assignmentId)));
    }

    @PostMapping("/{assignmentId}/arrive")
    public ResponseEntity<AssignmentResponse> confirmArrival(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponse.from(driverService.confirmArrival(CurrentUser.userId(), assignmentId)));
    }

    @PostMapping("/{assignmentId}/verify")
    public ResponseEntity<AssignmentResponse> verify(@PathVariable UUID assignmentId, @Valid @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(AssignmentResponse.from(driverService.verify(CurrentUser.userId(), assignmentId, request.code())));
    }

    @PostMapping("/{assignmentId}/collect")
    public ResponseEntity<AssignmentResponse> confirmCollection(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponse.from(driverService.confirmCollection(CurrentUser.userId(), assignmentId)));
    }

    @PostMapping("/{assignmentId}/deliver")
    public ResponseEntity<AssignmentResponse> confirmDelivery(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(AssignmentResponse.from(driverService.confirmDelivery(CurrentUser.userId(), assignmentId)));
    }

    @PostMapping("/{assignmentId}/fail")
    public ResponseEntity<AssignmentResponse> reportFailure(@PathVariable UUID assignmentId, @Valid @RequestBody ReasonNoteRequest request) {
        return ResponseEntity.ok(AssignmentResponse.from(
            driverService.reportFailure(CurrentUser.userId(), assignmentId, request.reason(), request.note())));
    }

    @PostMapping("/{assignmentId}/reschedule-request")
    public ResponseEntity<AssignmentResponse> requestReschedule(@PathVariable UUID assignmentId, @Valid @RequestBody ReasonNoteRequest request) {
        return ResponseEntity.ok(AssignmentResponse.from(
            driverService.requestReschedule(CurrentUser.userId(), assignmentId, request.reason(), request.note())));
    }
}
