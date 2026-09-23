package com.load.backend.customer;

import com.load.backend.common.security.CurrentUser;
import com.load.backend.customer.dto.CustomerProfileResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/profile")
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    public CustomerProfileController(CustomerProfileService customerProfileService) {
        this.customerProfileService = customerProfileService;
    }

    @GetMapping
    public ResponseEntity<CustomerProfileResponse> getOwnProfile() {
        return ResponseEntity.ok(customerProfileService.getOwnProfile(CurrentUser.userId()));
    }
}
