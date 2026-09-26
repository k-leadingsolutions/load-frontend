package com.load.backend.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.notification.InMemoryOtpDeliveryPort;
import com.load.backend.notification.OtpDeliveryPort;
import com.load.backend.payment.MockPaymentProvider;
import com.load.backend.payment.PaymentProvider;
import com.load.backend.pos.MockPosReadAdapter;
import com.load.backend.pos.PosReadPort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Proves the mock external-provider adapters (POS read, payment, OTP
 * delivery) are wired for non-production profiles only, so that a
 * {@code prod}-profile boot fails fast (missing required
 * {@link PosReadPort}/{@link PaymentProvider}/{@link OtpDeliveryPort} bean)
 * rather than silently running with mock/no-op behaviour.
 */
class MockProviderAdapterProfileTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(MockPosReadAdapter.class, MockPaymentProvider.class, InMemoryOtpDeliveryPort.class);

    @Test
    void mockAdaptersAreRegisteredByDefault() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(PosReadPort.class);
            assertThat(context).hasSingleBean(PaymentProvider.class);
            assertThat(context).hasSingleBean(OtpDeliveryPort.class);
        });
    }

    @Test
    void mockAdaptersAreRegisteredUnderNonProdProfiles() {
        contextRunner.withPropertyValues("spring.profiles.active=dev").run(context -> {
            assertThat(context).hasSingleBean(PosReadPort.class);
            assertThat(context).hasSingleBean(PaymentProvider.class);
            assertThat(context).hasSingleBean(OtpDeliveryPort.class);
        });
    }

    @Test
    void mockAdaptersAreAbsentUnderProdProfileSoStartupFailsFastWithoutARealProvider() {
        contextRunner.withPropertyValues("spring.profiles.active=prod").run(context -> {
            assertThat(context).doesNotHaveBean(PosReadPort.class);
            assertThat(context).doesNotHaveBean(PaymentProvider.class);
            assertThat(context).doesNotHaveBean(OtpDeliveryPort.class);
        });
    }
}
