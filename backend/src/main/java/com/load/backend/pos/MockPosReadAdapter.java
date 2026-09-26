package com.load.backend.pos;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Pass-1 mock/stub read adapter, used until real POS API credentials/spec are
 * available. Purely in-memory and read-only: no method here ever mutates POS or
 * LOAD order/payment state. Tests seed it directly via the package-visible
 * helper methods.
 *
 * <p>Restricted to non-production profiles via {@code @Profile("!prod")}: a
 * real {@link PosReadPort} must be supplied under the {@code prod} profile,
 * and the application must fail fast at startup if none is - never silently
 * fall back to this mock in production.
 */
@Component
@Profile("!prod")
public class MockPosReadAdapter implements PosReadPort {

    private final Map<UUID, PosInvoiceRecord> invoices = new ConcurrentHashMap<>();
    private final Set<UUID> unavailableOrders = ConcurrentHashMap.newKeySet();

    @Override
    public Optional<PosOrderRecord> findCustomerOrder(UUID loadOrderId) {
        if (unavailableOrders.contains(loadOrderId)) {
            throw new PosUnavailableException("POS is currently unavailable.");
        }
        PosInvoiceRecord invoice = invoices.get(loadOrderId);
        if (invoice == null) {
            return Optional.empty();
        }
        return Optional.of(new PosOrderRecord(invoice.externalInvoiceId(), invoice.status().name()));
    }

    @Override
    public PosInvoiceRecord getInvoiceForOrder(UUID loadOrderId) {
        if (unavailableOrders.contains(loadOrderId)) {
            throw new PosUnavailableException("POS is currently unavailable.");
        }
        return invoices.getOrDefault(
            loadOrderId,
            new PosInvoiceRecord(null, PosInvoiceRecord.PosInvoiceStatus.NOT_RECEIVED, null)
        );
    }

    @Override
    public Optional<PosRewardsRecord> getCustomerRewards(String externalCustomerId) {
        return Optional.empty();
    }

    /** Test/dev seam: publish a POS invoice as READY with the given authoritative total. */
    public void seedReadyInvoice(UUID loadOrderId, String externalInvoiceId, java.math.BigDecimal finalTotal) {
        invoices.put(loadOrderId, new PosInvoiceRecord(externalInvoiceId, PosInvoiceRecord.PosInvoiceStatus.READY, finalTotal));
    }

    /** Test/dev seam: simulate a POS outage for this order - reads must fail, never fabricate. */
    public void markUnavailable(UUID loadOrderId) {
        unavailableOrders.add(loadOrderId);
    }

    public void reset() {
        invoices.clear();
        unavailableOrders.clear();
    }
}
