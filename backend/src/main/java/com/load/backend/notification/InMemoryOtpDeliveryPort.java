package com.load.backend.notification;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Pass-1 dev/test OTP delivery adapter, used until a real SMS provider's
 * credentials/API are available. Never logs or persists the plaintext code:
 * it is only held, transiently, in an in-memory map keyed by mobile number,
 * so integration tests can retrieve the code they need to drive the
 * verification step without the production API ever exposing it in a
 * response body.
 *
 * <p>This is registered unconditionally (no {@code @Profile} guard), matching
 * the existing {@code MockPosReadAdapter}/{@code MockPaymentProvider}
 * convention for capabilities awaiting real provider integration.
 */
@Component
public class InMemoryOtpDeliveryPort implements OtpDeliveryPort {

    private final Map<String, String> lastSentCodes = new ConcurrentHashMap<>();

    @Override
    public void send(String mobileNumber, String code) {
        lastSentCodes.put(mobileNumber, code);
    }

    /** Test/dev seam only - never call this from production code paths. */
    public String lastSentCodeFor(String mobileNumber) {
        return lastSentCodes.get(mobileNumber);
    }

    public void reset() {
        lastSentCodes.clear();
    }
}
