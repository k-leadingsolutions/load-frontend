package com.load.backend.pos;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Enforces the STRICT READ-ONLY POS boundary: {@link PosReadPort} must never gain
 * a mutation method (create/update/confirm/adjust/sync/etc). This is a deny-list
 * reflection check so any future accidental addition of a mutating method fails
 * the build immediately.
 */
class PosReadPortContractTest {

    private static final Set<String> FORBIDDEN_PREFIXES = Set.of(
        "create", "update", "delete", "remove", "confirm", "adjust", "sync", "modify", "mutate", "write", "post", "charge", "pay", "cancel"
    );

    @Test
    void posReadPortExposesNoMutationMethods() {
        List<Method> methods = List.of(PosReadPort.class.getMethods());
        assertThat(methods).isNotEmpty();

        for (Method method : methods) {
            String lowerName = method.getName().toLowerCase();
            boolean forbidden = FORBIDDEN_PREFIXES.stream().anyMatch(lowerName::startsWith);
            assertThat(forbidden)
                .as("PosReadPort.%s looks like a mutation method - POS must remain strictly read-only", method.getName())
                .isFalse();
        }
    }

    @Test
    void posReadPortOnlyExposesKnownReadMethods() {
        Set<String> allowedMethodNames = Set.of("findCustomerOrder", "getInvoiceForOrder", "getCustomerRewards");
        for (Method method : PosReadPort.class.getMethods()) {
            assertThat(allowedMethodNames).contains(method.getName());
        }
    }
}
