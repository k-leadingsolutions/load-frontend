package com.load.backend.order.dto;

import com.load.backend.order.FulfilmentType;
import com.load.backend.order.InvoiceStatus;
import com.load.backend.order.Order;
import com.load.backend.order.OrderStatus;
import com.load.backend.order.PaymentStatus;
import com.load.backend.order.QuantityReviewStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    OrderStatus status,
    FulfilmentType fulfilmentType,
    UUID pickupAddressId,
    String pickupWindowDate,
    String pickupWindowLabel,
    UUID deliveryAddressId,
    String deliveryWindowDate,
    String deliveryWindowLabel,
    List<ServiceSelectionRequest> services,
    BigDecimal estimatedTotal,
    PaymentStatus paymentStatus,
    InvoiceStatus invoiceStatus,
    BigDecimal finalInvoiceTotal,
    boolean receivedAtStore,
    BigDecimal intakeWeightKg,
    List<String> intakeNotes,
    QuantityReviewStatus quantityReviewStatus,
    List<String> internalNotes
) {
    public static OrderResponse from(Order order) {
        List<ServiceSelectionRequest> services = order.getServices().stream()
            .map(s -> new ServiceSelectionRequest(s.getServiceId(), s.getQuantity(), s.getUnitLabel()))
            .toList();

        return new OrderResponse(
            order.getId(),
            order.getStatus(),
            order.getFulfilmentType(),
            order.getPickupAddressId(),
            order.getPickupWindowDate(),
            order.getPickupWindowLabel(),
            order.getDeliveryAddressId(),
            order.getDeliveryWindowDate(),
            order.getDeliveryWindowLabel(),
            services,
            order.getEstimatedTotal(),
            order.getPaymentStatus(),
            order.getInvoiceStatus(),
            order.getFinalInvoiceTotal(),
            order.isReceivedAtStore(),
            order.getIntakeWeightKg(),
            order.getIntakeNotes(),
            order.getQuantityReviewStatus(),
            order.getInternalNotes()
        );
    }
}

