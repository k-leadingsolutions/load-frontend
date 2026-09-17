package com.load.backend.payment;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentResponse(UUID id, UUID orderId, BigDecimal amount, PaymentRecordStatus status) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getOrderId(), payment.getAmount(), payment.getStatus());
    }
}
