package com.load.backend.payment;

import com.load.backend.common.security.CurrentUser;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/orders/{orderId}/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> pay(@PathVariable UUID orderId) {
        Payment payment = paymentService.pay(CurrentUser.userId(), orderId);
        return ResponseEntity.ok(PaymentResponse.from(payment));
    }
}
