package com.load.backend.notification;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Pass-1 dev/test OTP delivery adapter, used until a real SMS provider's
 * credentials/API are available. Never logs or persists the plaintext code:
 * it is only held, transiently, in an in-memory map keyed by mobile number,
 * so integration tests can retrieve the code they need to drive the
 * verification step without the production API ever exposing it in a
 * response body.
 *
 * <p>Restricted to non-production profiles via {@code @Profile("!prod")}: a
 * real {@link OtpDeliveryPort} must be supplied under the {@code prod}
 * profile, and the application must fail fast at startup if none is - never
 * silently fall back to this in-memory adapter in production.
 */
@Component
@Profile("!prod")
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
