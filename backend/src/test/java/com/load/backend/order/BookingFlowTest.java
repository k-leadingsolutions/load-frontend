package com.load.backend.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.order.dto.ServiceSelectionRequest;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class BookingFlowTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private CreateOrderRequest deliveryRequest(java.util.UUID pickupAddressId, java.util.UUID deliveryAddressId) {
        return new CreateOrderRequest(
            FulfilmentType.DELIVERY,
            pickupAddressId,
            "2026-01-01",
            "08:00-10:00",
            deliveryAddressId,
            "2026-01-03",
            "08:00-10:00",
            List.of(new ServiceSelectionRequest("wash-fold", 2, "bag")),
            new BigDecimal("150.00")
        );
    }

    private CreateOrderRequest storeCollectionRequest(java.util.UUID pickupAddressId) {
        return new CreateOrderRequest(
            FulfilmentType.STORE_COLLECTION,
            pickupAddressId,
            "2026-01-01",
            "08:00-10:00",
            null,
            null,
            null,
            List.of(new ServiceSelectionRequest("wash-fold", 1, "bag")),
            new BigDecimal("75.00")
        );
    }

    @Test
    void customerCreatesDeliveryBooking() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("delivery-customer@example.com");

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            url("/api/customer/orders"),
            org.springframework.http.HttpMethod.POST,
            HttpTestUtil.authed(customer.token(), deliveryRequest(customer.addressId(), customer.addressId())),
            OrderResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().fulfilmentType()).isEqualTo(FulfilmentType.DELIVERY);
        assertThat(response.getBody().status()).isEqualTo(OrderStatus.BOOKING_RECEIVED);
        assertThat(response.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.NOT_AVAILABLE);
        assertThat(response.getBody().paymentStatus()).isEqualTo(PaymentStatus.NOT_REQUIRED);
    }

    @Test
    void customerCreatesStoreCollectionBooking_neverPopulatesDeliveryFields() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("store-customer@example.com");

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            url("/api/customer/orders"),
            org.springframework.http.HttpMethod.POST,
            HttpTestUtil.authed(customer.token(), storeCollectionRequest(customer.addressId())),
            OrderResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().fulfilmentType()).isEqualTo(FulfilmentType.STORE_COLLECTION);
        assertNull(response.getBody().deliveryAddressId());
        assertNull(response.getBody().deliveryWindowDate());
        assertNull(response.getBody().deliveryWindowLabel());
    }

    @Test
    void bookingSucceedsWhilePosUnavailable() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("pos-outage-customer@example.com");
        mockPosReadAdapter.markUnavailable(java.util.UUID.randomUUID()); // unrelated order id - simulates general POS outage

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            url("/api/customer/orders"),
            org.springframework.http.HttpMethod.POST,
            HttpTestUtil.authed(customer.token(), storeCollectionRequest(customer.addressId())),
            OrderResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().invoiceStatus()).isEqualTo(InvoiceStatus.NOT_AVAILABLE);
    }

    @Test
    void customerCannotReadAnotherCustomersOrder() {
        TestUserFactory.ProvisionedCustomer owner = testUserFactory.createCustomer("owner@example.com");
        TestUserFactory.ProvisionedCustomer intruder = testUserFactory.createCustomer("intruder@example.com");

        ResponseEntity<OrderResponse> created = restTemplate.exchange(
            url("/api/customer/orders"),
            org.springframework.http.HttpMethod.POST,
            HttpTestUtil.authed(owner.token(), storeCollectionRequest(owner.addressId())),
            OrderResponse.class
        );
        java.util.UUID orderId = created.getBody().id();

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders/" + orderId),
            org.springframework.http.HttpMethod.GET,
            HttpTestUtil.authed(intruder.token()),
            String.class
        );

        assertThat(response.getStatusCode()).isIn(HttpStatus.NOT_FOUND, HttpStatus.FORBIDDEN);
    }

    @Test
    void customerCannotUseAnotherCustomersAddress() {
        TestUserFactory.ProvisionedCustomer owner = testUserFactory.createCustomer("addr-owner@example.com");
        TestUserFactory.ProvisionedCustomer intruder = testUserFactory.createCustomer("addr-intruder@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"),
            org.springframework.http.HttpMethod.POST,
            HttpTestUtil.authed(intruder.token(), storeCollectionRequest(owner.addressId())),
            String.class
        );

        assertThat(response.getStatusCode()).isIn(HttpStatus.NOT_FOUND, HttpStatus.FORBIDDEN);
    }
}
