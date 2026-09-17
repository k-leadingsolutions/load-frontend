package com.load.backend.order;

import com.load.backend.common.exception.NotFoundException;
import com.load.backend.customer.Address;
import com.load.backend.customer.AddressRepository;
import com.load.backend.customer.CustomerProfile;
import com.load.backend.customer.CustomerProfileRepository;
import com.load.backend.order.dto.CreateOrderRequest;
import com.load.backend.order.dto.ServiceSelectionRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final OrderRepository orderRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final AddressRepository addressRepository;

    public BookingService(
        OrderRepository orderRepository,
        CustomerProfileRepository customerProfileRepository,
        AddressRepository addressRepository
    ) {
        this.orderRepository = orderRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.addressRepository = addressRepository;
    }

    @Transactional
    public Order createBooking(UUID customerId, CreateOrderRequest request) {
        if (request.fulfilmentType() == FulfilmentType.DELIVERY) {
            if (request.deliveryAddressId() == null
                || isBlank(request.deliveryWindowDate())
                || isBlank(request.deliveryWindowLabel())) {
                throw new IllegalArgumentException(
                    "deliveryAddressId, deliveryWindowDate and deliveryWindowLabel are required for DELIVERY orders.");
            }
        }

        CustomerProfile profile = customerProfileRepository.findByUserId(customerId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));

        requireOwnedAddress(profile.getId(), request.pickupAddressId());

        // STORE_COLLECTION must never carry synthetic delivery data.
        UUID deliveryAddressId = request.fulfilmentType() == FulfilmentType.STORE_COLLECTION ? null : request.deliveryAddressId();
        String deliveryWindowDate = request.fulfilmentType() == FulfilmentType.STORE_COLLECTION ? null : request.deliveryWindowDate();
        String deliveryWindowLabel = request.fulfilmentType() == FulfilmentType.STORE_COLLECTION ? null : request.deliveryWindowLabel();

        if (deliveryAddressId != null) {
            requireOwnedAddress(profile.getId(), deliveryAddressId);
        }

        List<OrderServiceSelection> services = request.services().stream()
            .map(this::toEmbeddable)
            .toList();

        Order order = new Order(
            customerId,
            request.fulfilmentType(),
            request.pickupAddressId(),
            request.pickupWindowDate(),
            request.pickupWindowLabel(),
            deliveryAddressId,
            deliveryWindowDate,
            deliveryWindowLabel,
            services,
            request.estimatedTotal()
        );

        return orderRepository.save(order);
    }

    /** Ownership-scoped lookup: never trust a caller-supplied customerId for authorization. */
    @Transactional(readOnly = true)
    public Order getOwnedOrder(UUID customerId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found."));

        if (!order.getCustomerId().equals(customerId)) {
            // Deliberately identical to "not found" - no data leakage about other customers' orders.
            throw new NotFoundException("Order not found.");
        }

        return order;
    }

    @Transactional(readOnly = true)
    public List<Order> listOwnedOrders(UUID customerId) {
        return orderRepository.findByCustomerId(customerId);
    }

    private void requireOwnedAddress(UUID customerProfileId, UUID addressId) {
        Address address = addressRepository.findById(addressId)
            .orElseThrow(() -> new NotFoundException("Address not found."));
        if (!address.getCustomerId().equals(customerProfileId)) {
            throw new NotFoundException("Address not found.");
        }
    }

    private OrderServiceSelection toEmbeddable(ServiceSelectionRequest request) {
        return new OrderServiceSelection(request.serviceId(), request.quantity(), request.unitLabel());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
