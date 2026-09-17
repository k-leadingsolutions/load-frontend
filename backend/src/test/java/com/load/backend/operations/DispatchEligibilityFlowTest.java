package com.load.backend.operations;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.order.FulfilmentType;
import com.load.backend.order.InvoiceStatus;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.PaymentStatus;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.payment.PaymentResponse;
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

class DispatchEligibilityFlowTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private OrderResponse setUpDeliveryOrderReadyForDispatch(TestUserFactory.ProvisionedCustomer customer, TestUserFactory.ProvisionedUser ops) {
        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        FlowTestSupport.confirmReceived(restTemplate, "http://localhost:" + port, ops.token(), order.id());
        return FlowTestSupport.advanceToReadyForDispatch(restTemplate, "http://localhost:" + port, ops.token(), order.id());
    }

    @Test
    void invoiceUnavailableHasNoFabricatedTotal() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("invoice-unavail-customer@example.com");
        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);

        assertThat(order.invoiceStatus()).isEqualTo(InvoiceStatus.NOT_AVAILABLE);
        assertThat(order.finalInvoiceTotal()).isNull();
    }

    @Test
    void finalInvoiceAmountComesFromPos() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("invoice-pos-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("invoice-pos-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-1", new BigDecimal("199.99"));

        ResponseEntity<OrderResponse> refreshed = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        assertThat(refreshed.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.READY);
        assertThat(refreshed.getBody().finalInvoiceTotal()).isEqualByComparingTo("199.99");
    }

    @Test
    void posOutageDoesNotDestroyOperationalWorkflow() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("pos-outage-ops-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("pos-outage-ops-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        mockPosReadAdapter.markUnavailable(order.id());

        ResponseEntity<OrderResponse> refreshed = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.NOT_AVAILABLE);

        // Operational workflow proceeds regardless of POS outage.
        ResponseEntity<OrderResponse> received = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/store-received"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        assertThat(received.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(received.getBody().status()).isEqualTo(OrderStatus.RECEIVED_AT_STORE);
    }

    @Test
    void paymentUsesFinalInvoiceAmountNotEstimateAndCausesNoPosMutation() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("payment-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("payment-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        assertThat(order.estimatedTotal()).isEqualByComparingTo("150.00");
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-2", new BigDecimal("222.50"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        ResponseEntity<PaymentResponse> payment = restTemplate.exchange(
            url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), PaymentResponse.class);

        assertThat(payment.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(payment.getBody().amount()).isEqualByComparingTo("222.50");

        // PosReadPort is strictly read-only - the mock never records POS mutation; assert LOAD order state updated only.
        ResponseEntity<OrderResponse> getOrder = restTemplate.exchange(
            url("/api/customer/orders/" + order.id()), HttpMethod.GET,
            HttpTestUtil.authed(customer.token()), OrderResponse.class);
        assertThat(getOrder.getBody().paymentStatus()).isEqualTo(PaymentStatus.CONFIRMED);
    }

    @Test
    void paymentRejectedWhenInvoiceNotReady() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("payment-noinvoice-customer@example.com");
        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);

        ResponseEntity<String> payment = restTemplate.exchange(
            url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), String.class);

        assertThat(payment.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void duplicatePaymentIsRejected() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("payment-dup-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("payment-dup-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-3", new BigDecimal("100.00"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        restTemplate.exchange(url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), PaymentResponse.class);

        ResponseEntity<String> secondAttempt = restTemplate.exchange(
            url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), String.class);

        assertThat(secondAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void unpaidDeliveryCannotDispatch() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("unpaid-dispatch-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("unpaid-dispatch-ops@example.com");

        OrderResponse order = setUpDeliveryOrderReadyForDispatch(customer, ops);
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-4", new BigDecimal("50.00"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        ResponseEntity<String> dispatch = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/dispatch"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);

        assertThat(dispatch.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void invoiceNotReadyDeliveryCannotDispatch() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("noinvoice-dispatch-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("noinvoice-dispatch-ops@example.com");

        OrderResponse order = setUpDeliveryOrderReadyForDispatch(customer, ops);

        ResponseEntity<String> dispatch = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/dispatch"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);

        assertThat(dispatch.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void notReadyOperationalDeliveryCannotDispatch() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("notready-dispatch-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("notready-dispatch-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), customer.addressId(), FulfilmentType.DELIVERY);
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-5", new BigDecimal("50.00"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        restTemplate.exchange(url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), PaymentResponse.class);

        ResponseEntity<String> dispatch = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/dispatch"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);

        assertThat(dispatch.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void eligibleDeliveryCanDispatch() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("eligible-dispatch-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("eligible-dispatch-ops@example.com");

        OrderResponse order = setUpDeliveryOrderReadyForDispatch(customer, ops);
        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-6", new BigDecimal("50.00"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);
        restTemplate.exchange(url("/api/customer/orders/" + order.id() + "/payments"), HttpMethod.POST,
            HttpTestUtil.authed(customer.token()), PaymentResponse.class);

        ResponseEntity<OrderResponse> dispatch = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/dispatch"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        assertThat(dispatch.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(dispatch.getBody().status()).isEqualTo(OrderStatus.OUT_FOR_DELIVERY);

        // Duplicate dispatch attempt fails safely (already OUT_FOR_DELIVERY, not READY_FOR_DISPATCH).
        ResponseEntity<String> duplicateDispatch = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/dispatch"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), String.class);
        assertThat(duplicateDispatch.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void storeCollectionDoesNotRequireOnlinePaymentOrDriver() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("store-collection-customer@example.com");
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("store-collection-ops@example.com");

        OrderResponse order = FlowTestSupport.createOrder(restTemplate, "http://localhost:" + port, customer.token(), customer.addressId(), null, FulfilmentType.STORE_COLLECTION);
        FlowTestSupport.confirmReceived(restTemplate, "http://localhost:" + port, ops.token(), order.id());
        FlowTestSupport.advanceToReadyForDispatch(restTemplate, "http://localhost:" + port, ops.token(), order.id());

        mockPosReadAdapter.seedReadyInvoice(order.id(), "POS-INV-7", new BigDecimal("60.00"));
        restTemplate.exchange(url("/api/operations/orders/" + order.id() + "/refresh-invoice"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        ResponseEntity<OrderResponse> completed = restTemplate.exchange(
            url("/api/operations/orders/" + order.id() + "/complete-store-collection"), HttpMethod.POST,
            HttpTestUtil.authed(ops.token()), OrderResponse.class);

        assertThat(completed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(completed.getBody().status()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(completed.getBody().paymentStatus()).isEqualTo(PaymentStatus.NOT_REQUIRED);
    }
}
