package com.load.backend.support;

import com.load.backend.order.FulfilmentType;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.order.dto.ServiceSelectionRequest;
import com.load.backend.operations.dto.AssignDriverRequest;
import com.load.backend.driver.StopType;
import com.load.backend.driver.dto.AssignmentResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

/** Shared helpers to drive a full booking/operations/driver flow end-to-end in integration tests. */
public final class FlowTestSupport {

    private FlowTestSupport() {
    }

    public static OrderResponse createOrder(TestRestTemplate restTemplate, String baseUrl, String customerToken, UUID pickupAddressId, UUID deliveryAddressId, FulfilmentType fulfilmentType) {
        CreateOrderRequest request = fulfilmentType == FulfilmentType.DELIVERY
            ? new CreateOrderRequest(
                FulfilmentType.DELIVERY, pickupAddressId, "2026-01-01", "08:00-10:00",
                deliveryAddressId, "2026-01-03", "08:00-10:00",
                List.of(new ServiceSelectionRequest("wash-fold", 2, "bag")), new BigDecimal("150.00"))
            : new CreateOrderRequest(
                FulfilmentType.STORE_COLLECTION, pickupAddressId, "2026-01-01", "08:00-10:00",
                null, null, null,
                List.of(new ServiceSelectionRequest("wash-fold", 1, "bag")), new BigDecimal("75.00"));

        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            baseUrl + "/api/customer/orders", HttpMethod.POST,
            HttpTestUtil.authed(customerToken, request), OrderResponse.class);
        return response.getBody();
    }

    public static OrderResponse confirmReceived(TestRestTemplate restTemplate, String baseUrl, String opsToken, UUID orderId) {
        return restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/store-received", HttpMethod.POST,
            HttpTestUtil.authed(opsToken, null), OrderResponse.class).getBody();
    }

    public static OrderResponse advanceProduction(TestRestTemplate restTemplate, String baseUrl, String opsToken, UUID orderId) {
        return restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/advance-production", HttpMethod.POST,
            HttpTestUtil.authed(opsToken, null), OrderResponse.class).getBody();
    }

    /** Advances an order all the way through production stages up to and including READY_FOR_DISPATCH. */
    public static OrderResponse advanceToReadyForDispatch(TestRestTemplate restTemplate, String baseUrl, String opsToken, UUID orderId) {
        OrderResponse latest = null;
        while (latest == null || latest.status() != OrderStatus.READY_FOR_DISPATCH) {
            latest = advanceProduction(restTemplate, baseUrl, opsToken, orderId);
        }
        return latest;
    }

    public static ResponseEntity<AssignmentResponse> assignDriver(TestRestTemplate restTemplate, String baseUrl, String opsToken, UUID orderId, UUID driverId, StopType stopType) {
        return restTemplate.exchange(
            baseUrl + "/api/operations/orders/" + orderId + "/assign-driver", HttpMethod.POST,
            HttpTestUtil.authed(opsToken, new AssignDriverRequest(driverId, stopType)), AssignmentResponse.class);
    }
}
