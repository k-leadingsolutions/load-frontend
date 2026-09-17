package com.load.backend.pos;

import java.util.Optional;
import java.util.UUID;

/**
 * STRICT READ-ONLY boundary to the store's POS system. There must be NO mutation
 * method on this interface - no create/update order, no create/update invoice,
 * no confirm payment, no price adjustment. Enforced by
 * {@code PosReadPortContractTest} (reflection-based method-name deny-list).
 */
public interface PosReadPort {

    Optional<PosOrderRecord> findCustomerOrder(UUID loadOrderId);

    /** Never fabricates a total. Returns NOT_RECEIVED when the POS invoice does not exist yet. */
    PosInvoiceRecord getInvoiceForOrder(UUID loadOrderId);

    Optional<PosRewardsRecord> getCustomerRewards(String externalCustomerId);
}
