package com.load.backend.customer;

import com.load.backend.common.security.CurrentUser;
import com.load.backend.customer.dto.AddressResponse;
import com.load.backend.customer.dto.CreateAddressRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customer/addresses")
public class CustomerAddressController {

    private final CustomerAddressService addressService;

    public CustomerAddressController(CustomerAddressService addressService) {
        this.addressService = addressService;
    }

    @PostMapping
    public ResponseEntity<AddressResponse> create(@Valid @RequestBody CreateAddressRequest request) {
        Address address = addressService.createAddress(CurrentUser.userId(), request);
        return ResponseEntity.ok(AddressResponse.from(address));
    }

    @GetMapping
    public ResponseEntity<List<AddressResponse>> listMine() {
        List<AddressResponse> responses = addressService.listOwnedAddresses(CurrentUser.userId()).stream()
            .map(AddressResponse::from)
            .toList();
        return ResponseEntity.ok(responses);
    }
}
