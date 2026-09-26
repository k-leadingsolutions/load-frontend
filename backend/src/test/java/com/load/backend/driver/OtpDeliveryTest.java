package com.load.backend.driver;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.driver.dto.VerifyRequest;
import com.load.backend.notification.MobileNumberNormalizer;
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

/**
 * Focused coverage for the OTP delivery seam introduced for Driver arrival
 * verification: the code must be delivered through {@code OtpDeliveryPort}
 * (never logged/returned), the API response must never carry the plaintext
 * code, and the delivered code must still be the one that verification
 * accepts.
 */
class OtpDeliveryTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private UUID createEnRouteAssignment(TestUserFactory.ProvisionedCustomer customer, TestUserFactory.ProvisionedUser ops, TestUserFactory.ProvisionedDriver driver) {
        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        ResponseEntity<AssignmentResponse> assignment = FlowTestSupport.assignDriver(
            restTemplate, "http://localhost:" + port, ops.token(), order.id(), driver.driverId(), StopType.PICKUP);
        assertThat(assignment.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID assignmentId = assignment.getBody().id();

        ResponseEntity<AssignmentResponse> enRoute = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/en-route"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(enRoute.getStatusCode()).isEqualTo(HttpStatus.OK);

        return assignmentId;
    }

    @Test
    void arrivalDeliversOtpThroughPortAndNeverInHttpResponse() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("otp-delivery-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("otp-delivery-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("otp-delivery-driver@example.com");

        UUID assignmentId = createEnRouteAssignment(customer, ops, driver);

        // Raw string capture of the response body - proves no otpCode/code-shaped
        // field is present anywhere in the JSON, not just that a typed DTO omits it.
        ResponseEntity<String> rawArrival = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/arrive"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), String.class);
        assertThat(rawArrival.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rawArrival.getBody()).doesNotContainIgnoringCase("otpCode")
            .doesNotContainIgnoringCase("verificationCodeHash");

        String deliveredCode = otpDeliveryPort.lastSentCodeFor(MobileNumberNormalizer.normalize("0821234567"));
        assertThat(deliveredCode).isNotBlank();
        assertThat(deliveredCode).matches("\\d{6}");

        // The response body must not even coincidentally contain the delivered
        // digits (e.g. embedded in some other field), not just the field name.
        assertThat(rawArrival.getBody()).doesNotContain(deliveredCode);
    }

    @Test
    void deliveredOtpIsAcceptedByVerification() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("otp-verify-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("otp-verify-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("otp-verify-driver@example.com");

        UUID assignmentId = createEnRouteAssignment(customer, ops, driver);

        ResponseEntity<AssignmentResponse> arrival = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/arrive"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(arrival.getStatusCode()).isEqualTo(HttpStatus.OK);

        String deliveredCode = otpDeliveryPort.lastSentCodeFor(MobileNumberNormalizer.normalize("0821234567"));
        assertThat(deliveredCode).isNotBlank();

        ResponseEntity<AssignmentResponse> verify = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/verify"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest(deliveredCode)), AssignmentResponse.class);
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(verify.getBody().stopStatus()).isEqualTo(StopStatus.VERIFIED);
    }

    @Test
    void wrongCodeIsRejectedEvenThoughDeliveredCodeExists() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("otp-wrong-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("otp-wrong-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("otp-wrong-driver@example.com");

        UUID assignmentId = createEnRouteAssignment(customer, ops, driver);

        ResponseEntity<AssignmentResponse> arrival = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/arrive"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(arrival.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> verify = restTemplate.exchange(
            url("/api/driver/assignments/" + assignmentId + "/verify"), HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest("000000")), String.class);
        assertThat(verify.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
