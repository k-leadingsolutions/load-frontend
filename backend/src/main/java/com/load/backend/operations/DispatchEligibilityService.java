package com.load.backend.operations;

import com.load.backend.order.FulfilmentType;
import com.load.backend.order.InvoiceStatus;
import com.load.backend.order.Order;
import com.load.backend.order.PaymentStatus;
import org.springframework.stereotype.Component;

/**
 * Server-authoritative dispatch eligibility. This is the backend equivalent of
 * the frontend's (now purely UX) {@code isEligibleForDispatch()} - the backend
 * never trusts the frontend's own computation for authorization purposes.
 */
@Component
public class DispatchEligibilityService {

    public boolean isEligibleForDelivery(Order order) {
        if (order.getFulfilmentType() != FulfilmentType.DELIVERY) {
            return false;
        }
        if (order.getInvoiceStatus() != InvoiceStatus.READY) {
            return false;
        }
        return order.getPaymentStatus() == PaymentStatus.CONFIRMED;
    }

    public boolean isEligibleForStoreCollection(Order order) {
        if (order.getFulfilmentType() != FulfilmentType.STORE_COLLECTION) {
            return false;
        }
        // STORE_COLLECTION never requires online payment - paid at the store.
        return order.getInvoiceStatus() == InvoiceStatus.READY;
    }
}
