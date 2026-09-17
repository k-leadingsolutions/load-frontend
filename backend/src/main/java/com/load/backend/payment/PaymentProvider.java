package com.load.backend.payment;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payment provider behind an interface, per the "keep payment provider behind an
 * interface" requirement. No real payment gateway is integrated in Pass 1.
 */
public interface PaymentProvider {
    String charge(UUID orderId, BigDecimal amount);
}
