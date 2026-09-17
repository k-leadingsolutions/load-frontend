package com.load.backend.order;

import com.load.backend.common.security.CurrentUser;
import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.OrderResponse;
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

/** CUSTOMER-only booking endpoints. Ownership is always derived from the authenticated principal. */
@RestController
@RequestMapping("/api/customer/orders")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = bookingService.createBooking(CurrentUser.userId(), request);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> listMine() {
        List<OrderResponse> responses = bookingService.listOwnedOrders(CurrentUser.userId()).stream()
            .map(OrderResponse::from)
            .toList();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOne(@PathVariable UUID orderId) {
        Order order = bookingService.getOwnedOrder(CurrentUser.userId(), orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }
}
