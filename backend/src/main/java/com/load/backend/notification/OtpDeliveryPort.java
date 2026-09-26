package com.load.backend.notification;

/**
 * Boundary to a future SMS (or other) delivery channel for one-time
 * verification codes. There must be NO read-back method here that returns a
 * previously sent code to a caller in production - delivery is fire-and-forget
 * from the caller's perspective. Any observability of the delivered code is a
 * dev/test-only seam on the concrete adapter, never part of this contract.
 */
public interface OtpDeliveryPort {

    /**
     * Delivers {@code code} to {@code mobileNumber}. Implementations must never
     * log or persist the plaintext code - only the caller's already-hashed copy
     * (see {@code DriverAssignment.verificationCodeHash}) may be stored.
     */
    void send(String mobileNumber, String code);
}
