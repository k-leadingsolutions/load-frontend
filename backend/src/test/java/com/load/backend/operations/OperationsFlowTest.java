package com.load.backend.operations;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.driver.StopType;
import com.load.backend.driver.dto.AssignmentResponse;
import com.load.backend.operations.dto.DashboardMetricResponse;
import com.load.backend.operations.dto.InternalNoteRequest;
import com.load.backend.operations.dto.QualityCheckRequest;
import com.load.backend.operations.dto.QuantityReviewRequest;
import com.load.backend.operations.dto.StoreIntakeRequest;
import com.load.backend.order.FulfilmentType;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.QuantityReviewStatus;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.FlowTestSupport;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class OperationsFlowTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    @Test
    void storeIntakePersistsAfterReceivedAtStore() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("intake-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("intake-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/store-received"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        ResponseEntity<OrderResponse> intake = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/store-intake"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new StoreIntakeRequest(new BigDecimal("3.500"), "Two bags, minor stains")),
            OrderResponse.class);

        assertThat(intake.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(intake.getBody().intakeWeightKg()).isEqualByComparingTo("3.500");
        assertThat(intake.getBody().intakeNotes()).contains("Two bags, minor stains");
    }

    @Test
    void storeIntakeRejectedBeforeReceivedAtStore() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("intake-reject-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("intake-reject-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);

        ResponseEntity<String> intake = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/store-intake"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new StoreIntakeRequest(new BigDecimal("3.500"), "notes")),
            String.class);

        assertThat(intake.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void invalidProductionAdvanceIsRejectedBeforeStoreIntake() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("advance-reject-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("advance-reject-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/advance-production"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void productionAdvancesThroughToReadyForDispatch() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("advance-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("advance-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        FlowTestSupport.confirmReceived(restTemplate, "http://localhost:" + port, ops.token(), order.id());

        OrderResponse latest = FlowTestSupport.advanceToReadyForDispatch(restTemplate, "http://localhost:" + port, ops.token(), order.id());

        assertThat(latest.status()).isEqualTo(OrderStatus.READY_FOR_DISPATCH);

        ResponseEntity<String> alreadyReady = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/advance-production"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);
        assertThat(alreadyReady.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void quantityReviewStatusIsPersisted() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("qty-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("qty-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        assertThat(order.quantityReviewStatus()).isEqualTo(QuantityReviewStatus.PENDING);

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/quantity-review"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new QuantityReviewRequest(QuantityReviewStatus.ADJUSTED)), OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().quantityReviewStatus()).isEqualTo(QuantityReviewStatus.ADJUSTED);
    }

    @Test
    void internalNoteIsPersistedMostRecentFirst() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("note-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("note-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);

        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/notes"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new InternalNoteRequest("First note")), OrderResponse.class);
        ResponseEntity<OrderResponse> second = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/notes"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new InternalNoteRequest("Second note")), OrderResponse.class);

        assertThat(second.getBody().internalNotes()).containsExactly("Second note", "First note");
    }

    @Test
    void qualityCheckPassAdvancesToPackingAndFailReturnsToSorting() {
        TestUserFactory.ProvisionedCustomer passCustomer = testUserFactory.createCustomer("qc-pass-customer@example.com");
        TestUserFactory.ProvisionedCustomer failCustomer = testUserFactory.createCustomer("qc-fail-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("qc-ops@example.com");
        String baseUrl = "http://localhost:" + port;

        OrderResponse passOrder = FlowTestSupport.createOrder(restTemplate, baseUrl, passCustomer.token(), passCustomer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        FlowTestSupport.confirmReceived(restTemplate, baseUrl, ops.token(), passOrder.id());
        OrderResponse passAtQc = advanceToQualityCheck(ops.token(), passOrder.id());
        assertThat(passAtQc.status()).isEqualTo(OrderStatus.QUALITY_CHECK);

        ResponseEntity<OrderResponse> passResult = restTemplate.exchange(
            url("/api/operations/orders/" + passOrder.id() + "/quality-check"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new QualityCheckRequest(true, null)), OrderResponse.class);
        assertThat(passResult.getBody().status()).isEqualTo(OrderStatus.PACKING);

        OrderResponse failOrder = FlowTestSupport.createOrder(restTemplate, baseUrl, failCustomer.token(), failCustomer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        FlowTestSupport.confirmReceived(restTemplate, baseUrl, ops.token(), failOrder.id());
        advanceToQualityCheck(ops.token(), failOrder.id());

        ResponseEntity<OrderResponse> failResult = restTemplate.exchange(
            url("/api/operations/orders/" + failOrder.id() + "/quality-check"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new QualityCheckRequest(false, "Stains remain")), OrderResponse.class);
        assertThat(failResult.getBody().status()).isEqualTo(OrderStatus.SORTING);
        assertThat(failResult.getBody().internalNotes()).contains("Stains remain");
    }

    @Test
    void qualityCheckRejectedWhenNotAwaitingQc() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("qc-invalid-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("qc-invalid-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/quality-check"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token(), new QualityCheckRequest(true, null)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void dashboardMetricsNeverIncludeRevenue() {
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("metrics-ops@example.com");

        ResponseEntity<List<DashboardMetricResponse>> response = restTemplate.exchange(
            url("/api/operations/metrics"), HttpMethod.GET, HttpTestUtil.authed(ops.token()),
            new ParameterizedTypeReference<List<DashboardMetricResponse>>() { });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<DashboardMetricResponse> metrics = response.getBody();
        assertThat(metrics).extracting(DashboardMetricResponse::id).containsExactly("orders", "sla");
        assertThat(metrics).noneMatch(metric -> metric.id().equals("rev"));
    }

    @Test
    void assignmentsAreListedAcrossOrders() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("assign-list-customer@example.com");
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("assign-list-driver@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("assign-list-ops@example.com");
        String baseUrl = "http://localhost:" + port;

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, baseUrl, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        FlowTestSupport.assignDriver(restTemplate, baseUrl, ops.token(), order.id(), driver.driverId(), StopType.PICKUP);

        ResponseEntity<List<AssignmentResponse>> response = restTemplate.exchange(
            url("/api/operations/assignments"), HttpMethod.GET, HttpTestUtil.authed(ops.token()),
            new ParameterizedTypeReference<List<AssignmentResponse>>() { });

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).anyMatch(assignment -> assignment.orderId().equals(order.id()) && assignment.driverId().equals(driver.driverId()));
    }

    private OrderResponse advanceToQualityCheck(String opsToken, java.util.UUID orderId) {
        OrderResponse latest = null;
        while (latest == null || latest.status() != OrderStatus.QUALITY_CHECK) {
            latest = FlowTestSupport.advanceProduction(restTemplate, "http://localhost:" + port, opsToken, orderId);
        }
        return latest;
    }
}
