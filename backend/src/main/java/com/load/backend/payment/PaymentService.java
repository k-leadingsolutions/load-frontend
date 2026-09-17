package com.load.backend.payment;

import com.load.backend.common.exception.InvalidTransitionException;
import com.load.backend.common.exception.NotFoundException;
import com.load.backend.order.InvoiceStatus;
import com.load.backend.order.Order;
import com.load.backend.order.OrderRepository;
import com.load.backend.order.PaymentStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentProvider paymentProvider;

    public PaymentService(OrderRepository orderRepository, PaymentRepository paymentRepository, PaymentProvider paymentProvider) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.paymentProvider = paymentProvider;
    }

    @Transactional
    public Payment pay(UUID customerId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found."));

        if (!order.getCustomerId().equals(customerId)) {
            throw new NotFoundException("Order not found.");
        }

        if (order.getPaymentStatus() == PaymentStatus.CONFIRMED) {
            // Idempotency: a duplicate payment attempt must fail safely, not double-charge.
            throw new InvalidTransitionException("ALREADY_PAID", "This order has already been paid.");
        }

        if (order.getInvoiceStatus() != InvoiceStatus.READY || order.getFinalInvoiceTotal() == null) {
            throw new InvalidTransitionException("INVOICE_NOT_READY", "Payment requires a READY invoice with a final total.");
        }

        // Payment amount MUST equal the authoritative final invoice amount - never the booking estimate.
        String providerReference = paymentProvider.charge(orderId, order.getFinalInvoiceTotal());

        Payment payment = new Payment(orderId, order.getFinalInvoiceTotal(), PaymentRecordStatus.CONFIRMED, providerReference);
        paymentRepository.save(payment);

        order.setPaymentStatus(PaymentStatus.CONFIRMED);
        orderRepository.save(order);

        return payment;
    }
}
