package com.load.backend.order;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.auth.dto.AuthResponse;
import com.load.backend.auth.dto.LoginRequest;
import com.load.backend.auth.dto.RegisterCustomerRequest;
import com.load.backend.customer.dto.AddressResponse;
import com.load.backend.customer.dto.CreateAddressRequest;
import com.load.backend.driver.StopStatus;
import com.load.backend.driver.StopType;
import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.driver.dto.VerifyRequest;
import com.load.backend.notification.MobileNumberNormalizer;
import com.load.backend.operations.dto.AssignDriverRequest;
import com.load.backend.operations.dto.QualityCheckRequest;
import com.load.backend.operations.dto.StoreIntakeRequest;
import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.order.dto.ServiceSelectionRequest;
import com.load.backend.payment.PaymentResponse;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * End-to-end proof that the complete MVP DELIVERY lifecycle works across the
 * real (non-mock) application services/endpoints, using only the existing
 * test/dev external-provider adapters (POS read seam, OTP delivery seam,
 * payment provider stub):
 *
 * <p>Customer register/login -&gt; booking -&gt; Driver pickup assignment/collection
 * -&gt; Operations intake/production/QC -&gt; POS invoice refresh -&gt; Customer
 * payment -&gt; dispatch -&gt; Driver delivery -&gt; completion.
 */
class DeliveryLifecycleE2ETest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private static final String CUSTOMER_MOBILE = "082 111 2222";

    @Test
    void completeDeliveryLifecycleReachesCompletedWithFinancialIntegrityAndRoleEnforcement() {
        String baseUrl = "http://localhost:" + port;

        // --- Customer: register (real HTTP, real auth) ---
        RegisterCustomerRequest registerRequest = new RegisterCustomerRequest(
            "e2e-customer@example.com", "Password123!", "Ella", "Customer", CUSTOMER_MOBILE);
        ResponseEntity<AuthResponse> registerResponse = restTemplate.postForEntity(
            baseUrl + "/api/auth/register/customer", registerRequest, AuthResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(registerResponse.getBody().role().name()).isEqualTo("CUSTOMER");

        // --- Customer: login (real HTTP, confirms credentials actually work, independent of registration's token) ---
        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
            baseUrl + "/api/auth/login", new LoginRequest("e2e-customer@example.com", "Password123!"), AuthResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        String customerToken = loginResponse.getBody().token();

        // --- Customer: create pickup/delivery address ---
        ResponseEntity<AddressResponse> addressResponse = restTemplate.exchange(
            baseUrl + "/api/customer/addresses", HttpMethod.POST,
            HttpTestUtil.authed(customerToken, new CreateAddressRequest("Home", "1 Main Street", null, "Suburb", "Cape Town", "8000")),
            AddressResponse.class);
        assertThat(addressResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID addressId = addressResponse.getBody().id();

        // --- Customer: booking (DELIVERY) ---
        CreateOrderRequest bookingRequest = new CreateOrderRequest(
            FulfilmentType.DELIVERY, addressId, "2026-01-01", "08:00-10:00",
            addressId, "2026-01-03", "08:00-10:00",
            List.of(new ServiceSelectionRequest("wash-fold", 2, "bag")), new BigDecimal("150.00"));
        ResponseEntity<OrderResponse> bookingResponse = restTemplate.exchange(
            baseUrl + "/api/customer/orders", HttpMethod.POST,
            HttpTestUtil.authed(customerToken, bookingRequest), OrderResponse.class);
        assertThat(bookingResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID orderId = bookingResponse.getBody().id();
        assertThat(bookingResponse.getBody().status()).isEqualTo(OrderStatus.BOOKING_RECEIVED);
        assertThat(bookingResponse.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.NOT_AVAILABLE);

        // Driver/Operations accounts have no self-registration (provisioned out-of-band) - use the test factory.
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("e2e-ops@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("e2e-driver@example.com");
        TestUserFactory.ProvisionedDriver otherDriver = testUserFactory.createDriver("e2e-other-driver@example.com");

        // --- Ownership/roles: an unrelated Customer cannot see this order ---
        TestUserFactory.ProvisionedCustomer otherCustomer = testUserFactory.createCustomer("e2e-other-customer@example.com");
        ResponseEntity<String> strangerAccess = restTemplate.exchange(
            baseUrl + "/api/customer/orders/" + orderId, HttpMethod.GET,
            HttpTestUtil.authed(otherCustomer.token()), String.class);
        assertThat(strangerAccess.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // --- Operations: assign Driver to the PICKUP stop ---
        ResponseEntity<AssignmentResponse> pickupAssignmentResponse = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/assign-driver", HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new AssignDriverRequest(driver.driverId(), StopType.PICKUP)), AssignmentResponse.class);
        assertThat(pickupAssignmentResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID pickupAssignmentId = pickupAssignmentResponse.getBody().id();

        // --- Ownership/roles: another Driver cannot act on this Driver's assignment ---
        ResponseEntity<String> crossDriverAttempt = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + pickupAssignmentId + "/en-route", HttpMethod.POST,
            HttpTestUtil.authed(otherDriver.token()), String.class);
        assertThat(crossDriverAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // --- Driver: collection lifecycle, including OTP delivery via the port ---
        restTemplate.exchange(baseUrl + "/api/driver/assignments/" + pickupAssignmentId + "/en-route", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);

        ResponseEntity<String> rawPickupArrival = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + pickupAssignmentId + "/arrive", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), String.class);
        assertThat(rawPickupArrival.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rawPickupArrival.getBody()).doesNotContainIgnoringCase("otpCode");

        String normalizedMobile = MobileNumberNormalizer.normalize(CUSTOMER_MOBILE);
        String pickupOtp = otpDeliveryPort.lastSentCodeFor(normalizedMobile);
        assertThat(pickupOtp).matches("\\d{6}");

        ResponseEntity<AssignmentResponse> pickupVerify = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + pickupAssignmentId + "/verify", HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest(pickupOtp)), AssignmentResponse.class);
        assertThat(pickupVerify.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pickupVerify.getBody().stopStatus()).isEqualTo(StopStatus.VERIFIED);

        ResponseEntity<AssignmentResponse> pickupCollected = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + pickupAssignmentId + "/collect", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(pickupCollected.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pickupCollected.getBody().stopStatus()).isEqualTo(StopStatus.COLLECTED);

        // --- Operations: store intake, production, quality check ---
        ResponseEntity<OrderResponse> received = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/store-received", HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        assertThat(received.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(received.getBody().status()).isEqualTo(OrderStatus.RECEIVED_AT_STORE);

        ResponseEntity<OrderResponse> intake = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/store-intake", HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new StoreIntakeRequest(new BigDecimal("4.50"), "Two bags, no stains noted")),
            OrderResponse.class);
        assertThat(intake.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(intake.getBody().intakeWeightKg()).isEqualByComparingTo("4.50");

        OrderResponse latest = intake.getBody();
        while (latest.status() != OrderStatus.QUALITY_CHECK) {
            latest = advanceProduction(baseUrl, ops.token(), orderId);
        }
        assertThat(latest.status()).isEqualTo(OrderStatus.QUALITY_CHECK);

        ResponseEntity<OrderResponse> qualityCheck = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/quality-check", HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new QualityCheckRequest(true, "Passed final inspection")),
            OrderResponse.class);
        assertThat(qualityCheck.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(qualityCheck.getBody().status()).isEqualTo(OrderStatus.PACKING);

        latest = qualityCheck.getBody();
        while (latest.status() != OrderStatus.READY_FOR_DISPATCH) {
            latest = advanceProduction(baseUrl, ops.token(), orderId);
        }
        assertThat(latest.status()).isEqualTo(OrderStatus.READY_FOR_DISPATCH);

        // --- Dispatch must be impossible before invoice READY + payment CONFIRMED ---
        ResponseEntity<String> earlyDispatchAttempt = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/dispatch", HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);
        assertThat(earlyDispatchAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // --- POS: seed the authoritative invoice, then refresh the LOAD-side projection from it ---
        BigDecimal posAuthoritativeTotal = new BigDecimal("212.75");
        mockPosReadAdapter.seedReadyInvoice(orderId, "POS-E2E-INV-1", posAuthoritativeTotal);
        ResponseEntity<OrderResponse> refreshed = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/refresh-invoice", HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.READY);
        assertThat(refreshed.getBody().finalInvoiceTotal()).isEqualByComparingTo(posAuthoritativeTotal);
        // The invoice total must never equal the booking estimate - proves it came from POS, not the booking.
        assertThat(refreshed.getBody().finalInvoiceTotal()).isNotEqualByComparingTo(bookingResponse.getBody().estimatedTotal());

        // --- Dispatch still impossible: invoice is READY but payment is not yet CONFIRMED ---
        ResponseEntity<String> unpaidDispatchAttempt = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/dispatch", HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);
        assertThat(unpaidDispatchAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // --- Customer: payment - amount must be the POS-authoritative finalInvoiceTotal, never the estimate ---
        ResponseEntity<PaymentResponse> payment = restTemplate.exchange(
            baseUrl + "/api/customer/orders/" + orderId + "/payments", HttpMethod.POST,
            HttpTestUtil.authed(customerToken), PaymentResponse.class);
        assertThat(payment.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(payment.getBody().amount()).isEqualByComparingTo(posAuthoritativeTotal);

        // --- Dispatch now eligible ---
        ResponseEntity<OrderResponse> dispatch = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/dispatch", HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        assertThat(dispatch.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(dispatch.getBody().status()).isEqualTo(OrderStatus.OUT_FOR_DELIVERY);

        // --- Operations: assign the Driver to the DELIVERY stop ---
        ResponseEntity<AssignmentResponse> deliveryAssignmentResponse = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/assign-driver", HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new AssignDriverRequest(driver.driverId(), StopType.DELIVERY)), AssignmentResponse.class);
        assertThat(deliveryAssignmentResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        UUID deliveryAssignmentId = deliveryAssignmentResponse.getBody().id();

        // --- Driver: delivery lifecycle, including a second, independent OTP delivery ---
        restTemplate.exchange(baseUrl + "/api/driver/assignments/" + deliveryAssignmentId + "/en-route", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);

        ResponseEntity<String> rawDeliveryArrival = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + deliveryAssignmentId + "/arrive", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), String.class);
        assertThat(rawDeliveryArrival.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rawDeliveryArrival.getBody()).doesNotContainIgnoringCase("otpCode");

        String deliveryOtp = otpDeliveryPort.lastSentCodeFor(normalizedMobile);
        assertThat(deliveryOtp).matches("\\d{6}");

        ResponseEntity<AssignmentResponse> deliveryVerify = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + deliveryAssignmentId + "/verify", HttpMethod.POST,
            HttpTestUtil.authed(driver.token(), new VerifyRequest(deliveryOtp)), AssignmentResponse.class);
        assertThat(deliveryVerify.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deliveryVerify.getBody().stopStatus()).isEqualTo(StopStatus.VERIFIED);

        ResponseEntity<AssignmentResponse> delivered = restTemplate.exchange(
            baseUrl + "/api/driver/assignments/" + deliveryAssignmentId + "/deliver", HttpMethod.POST,
            HttpTestUtil.authed(driver.token()), AssignmentResponse.class);
        assertThat(delivered.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(delivered.getBody().stopStatus()).isEqualTo(StopStatus.DELIVERED);

        // --- Final assertion: the order reaches its expected completed state, financial truth intact ---
        ResponseEntity<OrderResponse> finalOrder = restTemplate.exchange(
            baseUrl + "/api/customer/orders/" + orderId, HttpMethod.GET,
            HttpTestUtil.authed(customerToken), OrderResponse.class);
        assertThat(finalOrder.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(finalOrder.getBody().status()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(finalOrder.getBody().paymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
        assertThat(finalOrder.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.READY);
        assertThat(finalOrder.getBody().finalInvoiceTotal()).isEqualByComparingTo(posAuthoritativeTotal);
    }

    private OrderResponse advanceProduction(String baseUrl, String opsToken, UUID orderId) {
        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/advance-production", HttpMethod.POST,
            HttpTestUtil.authed(opsToken), OrderResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }
}
