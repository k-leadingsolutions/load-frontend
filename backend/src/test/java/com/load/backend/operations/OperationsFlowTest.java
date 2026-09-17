package com.load.backend.operations;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.operations.dto.StoreIntakeRequest;
import com.load.backend.order.FulfilmentType;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.FlowTestSupport;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
}
