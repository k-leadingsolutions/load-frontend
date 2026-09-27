package com.load.backend.order;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.OrderResponse;
import com.load.backend.order.dto.ServiceSelectionRequest;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Covers server-generated, human-friendly LOAD order numbers: format,
 * uniqueness/collision-safety under concurrent inserts, immutability across
 * the order lifecycle, and safe backfill of pre-migration rows. The UUID
 * `id` remains the sole routing/API identifier throughout - these tests only
 * assert on the additional `orderNumber` field.
 */
class OrderNumberTest extends AbstractIntegrationTest {

    private static final java.util.regex.Pattern ORDER_NUMBER_PATTERN = java.util.regex.Pattern.compile("^LD\\d{5,}$");

    @Autowired
    private TestUserFactory testUserFactory;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DataSource dataSource;

    private CreateOrderRequest storeCollectionRequest(UUID pickupAddressId) {
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

    private OrderResponse createOrder(TestUserFactory.ProvisionedCustomer customer) {
        ResponseEntity<OrderResponse> response = restTemplate.exchange(
            url("/api/customer/orders"),
            HttpMethod.POST,
            HttpTestUtil.authed(customer.token(), storeCollectionRequest(customer.addressId())),
            OrderResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    @Test
    void newOrderGetsAWellFormedOrderNumber_distinctFromTheUuidId() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("order-number-format@example.com");

        OrderResponse order = createOrder(customer);

        assertThat(order.orderNumber()).isNotBlank();
        assertThat(order.orderNumber()).matches(ORDER_NUMBER_PATTERN);
        assertThat(order.orderNumber()).isNotEqualTo(order.id().toString());
    }

    @Test
    void orderNumbersAreUniqueAcrossMultipleOrders() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("order-number-unique@example.com");

        Set<String> orderNumbers = new HashSet<>();
        for (int i = 0; i < 5; i++) {
            OrderResponse order = createOrder(customer);
            assertThat(orderNumbers.add(order.orderNumber())).isTrue();
        }
    }

    @Test
    void orderNumberIsStableAcrossTheOrderLifecycle() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("order-number-stable@example.com");
        OrderResponse created = createOrder(customer);

        ResponseEntity<OrderResponse> fetched = restTemplate.exchange(
            url("/api/customer/orders/" + created.id()),
            HttpMethod.GET,
            HttpTestUtil.authed(customer.token()),
            OrderResponse.class
        );

        assertThat(fetched.getBody().orderNumber()).isEqualTo(created.orderNumber());
    }

    @Test
    void concurrentInsertsNeverProduceDuplicateOrderNumbers() throws Exception {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("order-number-concurrency@example.com");

        int threadCount = 8;
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(threadCount);
        try {
            List<java.util.concurrent.Future<String>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < threadCount; i++) {
                futures.add(pool.submit(() -> createOrder(customer).orderNumber()));
            }
            Set<String> orderNumbers = new HashSet<>();
            for (java.util.concurrent.Future<String> future : futures) {
                assertThat(orderNumbers.add(future.get())).isTrue();
            }
            assertThat(orderNumbers).hasSize(threadCount);
        } finally {
            pool.shutdown();
        }
    }

    @Test
    void preExistingRowsWithoutAnOrderNumberGetSafelyBackfilled() throws Exception {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("order-number-backfill@example.com");
        UUID legacyOrderId = UUID.randomUUID();
        Instant now = Instant.now();

        // Faithfully reproduce the pre-migration situation the V3 migration's
        // backfill step had to handle: a legacy row with no order_number.
        // The NOT NULL constraint (added by V3 only after backfilling) is
        // dropped and restored around this to allow inserting such a row.
        try (Connection connection = dataSource.getConnection()) {
            try (var relaxConstraint = connection.prepareStatement(
                "ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL")) {
                relaxConstraint.executeUpdate();
            }

            try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO orders (id, customer_id, status, fulfilment_type, pickup_address_id, "
                    + "pickup_window_date, pickup_window_label, estimated_total, payment_status, invoice_status, "
                    + "received_at_store, created_at, updated_at, version, order_number) "
                    + "VALUES (?, ?, 'BOOKING_RECEIVED', 'STORE_COLLECTION', ?, '2026-01-01', '08:00-10:00', "
                    + "75.00, 'NOT_REQUIRED', 'NOT_AVAILABLE', false, ?, ?, 0, NULL)")) {
                insert.setObject(1, legacyOrderId);
                insert.setObject(2, customer.userId());
                insert.setObject(3, customer.addressId());
                insert.setObject(4, java.sql.Timestamp.from(now));
                insert.setObject(5, java.sql.Timestamp.from(now));
                insert.executeUpdate();
            }

            // Apply the exact same backfill statement the V3 migration runs.
            try (PreparedStatement backfill = connection.prepareStatement(
                "UPDATE orders SET order_number = 'LD' || nextval('order_number_seq') WHERE order_number IS NULL")) {
                backfill.executeUpdate();
            }

            try (var restoreConstraint = connection.prepareStatement(
                "ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL")) {
                restoreConstraint.executeUpdate();
            }

            try (PreparedStatement select = connection.prepareStatement(
                "SELECT order_number FROM orders WHERE id = ?")) {
                select.setObject(1, legacyOrderId);
                try (ResultSet rs = select.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    String orderNumber = rs.getString(1);
                    assertThat(orderNumber).isNotNull();
                    assertThat(orderNumber).matches(ORDER_NUMBER_PATTERN);
                }
            }
        }
    }
}
