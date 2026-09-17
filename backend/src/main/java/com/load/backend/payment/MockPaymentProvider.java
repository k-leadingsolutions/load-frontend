package com.load.backend.payment;

import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Backend-owned mock payment flow, sufficient for frontend integration. Never
 * stores/logs card data (none is ever received here) and never mutates POS.
 */
@Component
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public String charge(UUID orderId, BigDecimal amount) {
        return "MOCK-" + orderId + "-" + System.currentTimeMillis();
    }
}
