package com.load.backend.payment;

import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Backend-owned mock payment flow, sufficient for frontend integration. Never
 * stores/logs card data (none is ever received here) and never mutates POS.
 *
 * <p>Restricted to non-production profiles via {@code @Profile("!prod")}: a
 * real {@link PaymentProvider} must be supplied under the {@code prod}
 * profile, and the application must fail fast at startup if none is - never
 * silently fall back to this mock in production.
 */
@Component
@Profile("!prod")
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public String charge(UUID orderId, BigDecimal amount) {
        return "MOCK-" + orderId + "-" + System.currentTimeMillis();
    }
}
