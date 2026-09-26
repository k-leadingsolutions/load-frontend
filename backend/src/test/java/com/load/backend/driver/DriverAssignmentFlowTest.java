package com.load.backend.driver;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.driver.dto.ReasonNoteRequest;
import com.load.backend.driver.dto.VerifyRequest;
import com.load.backend.order.FulfilmentType;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.FlowTestSupport;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class DriverAssignmentFlowTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private UUID createAssignedOrderAssignment(TestUserFactory.ProvisionedCustomer customer, TestUserFactory.ProvisionedUser ops, TestUserFactory.ProvisionedDriver driver, StopType stopType) {
        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        ResponseEntity<AssignmentResponse> assignment = FlowTestSupport.assignDriver(
            restTemplate, "http://localhost:" + port, ops.token(), order.id(), driver.driverId(), stopType);
        assertThat(assignment.getStatusCode()).isEqualTo(HttpStatus.OK);
        return assignment.getBody().id();
    }

    @Test
    void validDriverTransitionsSucceed() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("driver-flow-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("driver-flow-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("driver-flow-driver@example.com");

        UUID assignmentId = createAssignedOrderAssignment(customer, ops, driver, StopType.PICKUP);

        ResponseEntity<AssignmentResponse> enRoute = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/en-route"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(enRoute.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(enRoute.getBody().stopStatus()).isEqualTo(StopStatus.EN_ROUTE);

        ResponseEntity<AssignmentResponse> arrival = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/arrive"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(arrival.getStatusCode()).isEqualTo(HttpStatus.OK);
        String otp = otpDeliveryPort.lastSentCodeFor("0821234567");
        assertThat(otp).isNotBlank();

        ResponseEntity<AssignmentResponse> verify = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/verify"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest(otp)), AssignmentResponse.class);
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(verify.getBody().stopStatus()).isEqualTo(StopStatus.VERIFIED);

        ResponseEntity<AssignmentResponse> collect = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/collect"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(collect.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(collect.getBody().stopStatus()).isEqualTo(StopStatus.COLLECTED);
    }

    @Test
    void invalidDriverTransitionIsRejected() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("invalid-transition-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("invalid-transition-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("invalid-transition-driver@example.com");

        UUID assignmentId = createAssignedOrderAssignment(customer, ops, driver, StopType.PICKUP);

        // Skip en-route: try to verify directly from ASSIGNED.
        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/verify"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest("000000")), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void failedAssignmentCannotSubsequentlyComplete() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("failed-flow-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("failed-flow-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("failed-flow-driver@example.com");

        UUID assignmentId = createAssignedOrderAssignment(customer, ops, driver, StopType.PICKUP);

        ResponseEntity<AssignmentResponse> failed = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/fail"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new ReasonNoteRequest(RescheduleReason.CUSTOMER_UNAVAILABLE, "Nobody home")),
            AssignmentResponse.class);
        assertThat(failed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(failed.getBody().stopStatus()).isEqualTo(StopStatus.FAILED);

        ResponseEntity<String> collectAttempt = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/collect"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), String.class);
        assertThat(collectAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // Operations retries - assignment returns to ASSIGNED, valid path restored.
        ResponseEntity<AssignmentResponse> retried = restTemplate.exchange(
            url("/api/operations/assignments/" + assignmentId + "/retry"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), AssignmentResponse.class);
        assertThat(retried.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retried.getBody().stopStatus()).isEqualTo(StopStatus.ASSIGNED);
    }

    @Test
    void driverCannotAccessAnotherDriversAssignment() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("cross-driver-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("cross-driver-ops@example.com");
        TestUserFactory.ProvisionedDriver driverA = testUserFactory.createDriver("driver-a@example.com");
        TestUserFactory.ProvisionedDriver driverB = testUserFactory.createDriver("driver-b@example.com");

        UUID assignmentId = createAssignedOrderAssignment(customer, ops, driverA, StopType.PICKUP);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/en-route"), HttpMethod.POST,
            HttpTestUtil.authed(driverB.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void driverRescheduleRequestPersistsAndOperationsCanApprove() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("reschedule-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("reschedule-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("reschedule-driver@example.com");

        UUID assignmentId = createAssignedOrderAssignment(customer, ops, driver, StopType.PICKUP);

        ResponseEntity<AssignmentResponse> requested = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/reschedule-request"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new ReasonNoteRequest(RescheduleReason.CUSTOMER_REQUESTED_NEW_TIME, "Please come tomorrow")),
            AssignmentResponse.class);
        assertThat(requested.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(requested.getBody().stopStatus()).isEqualTo(StopStatus.RESCHEDULE_REQUESTED);

        ResponseEntity<AssignmentResponse> decided = restTemplate.exchange(
            url("/api/operations/assignments/" + assignmentId + "/reschedule-decision"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new com.load.backend.operations.dto.RescheduleDecisionRequest("APPROVED", "Rebooked")),
            AssignmentResponse.class);
        assertThat(decided.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(decided.getBody().stopStatus()).isEqualTo(StopStatus.ASSIGNED);
    }
}
