package com.load.backend.invoice;

import com.load.backend.order.InvoiceStatus;
import com.load.backend.order.Order;
import com.load.backend.order.OrderRepository;
import com.load.backend.pos.PosInvoiceRecord;
import com.load.backend.pos.PosReadPort;
import com.load.backend.pos.PosUnavailableException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refreshes the LOAD-side invoice projection from the read-only POS boundary.
 * Never fabricates a total, and a POS outage here never corrupts the order -
 * the previously known projection (if any) is simply left untouched.
 */
@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final PosReadPort posReadPort;

    public InvoiceService(InvoiceRepository invoiceRepository, OrderRepository orderRepository, PosReadPort posReadPort) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.posReadPort = posReadPort;
    }

    @Transactional
    public Order refreshInvoice(UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found."));

        PosInvoiceRecord posInvoice;
        try {
            posInvoice = posReadPort.getInvoiceForOrder(orderId);
        } catch (PosUnavailableException ex) {
            // POS outage must not prevent LOAD-owned operational data from being read/updated elsewhere;
            // it simply means the invoice projection cannot be refreshed right now.
            return order;
        }

        if (posInvoice.status() == PosInvoiceRecord.PosInvoiceStatus.READY) {
            order.setInvoiceStatus(InvoiceStatus.READY);
            order.setFinalInvoiceTotal(posInvoice.finalTotal());
            order.setExternalInvoiceId(posInvoice.externalInvoiceId());

            Invoice invoice = invoiceRepository.findByOrderId(orderId)
                .orElseGet(() -> new Invoice(orderId, posInvoice.externalInvoiceId(), InvoiceProjectionStatus.READY, posInvoice.finalTotal()));
            invoice.update(posInvoice.externalInvoiceId(), InvoiceProjectionStatus.READY, posInvoice.finalTotal());
            invoiceRepository.save(invoice);
        }
        // NOT_RECEIVED: leave the order's existing NOT_AVAILABLE projection untouched - never fabricate.

        return orderRepository.save(order);
    }
}
