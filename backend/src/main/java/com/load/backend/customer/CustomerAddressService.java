package com.load.backend.customer;

import com.load.backend.common.exception.NotFoundException;
import com.load.backend.customer.dto.CreateAddressRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerAddressService {

    private final CustomerProfileRepository customerProfileRepository;
    private final AddressRepository addressRepository;

    public CustomerAddressService(CustomerProfileRepository customerProfileRepository, AddressRepository addressRepository) {
        this.customerProfileRepository = customerProfileRepository;
        this.addressRepository = addressRepository;
    }

    @Transactional
    public Address createAddress(UUID customerUserId, CreateAddressRequest request) {
        CustomerProfile profile = customerProfileRepository.findByUserId(customerUserId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));

        Address address = new Address(
            profile.getId(), request.label(), request.line1(), request.line2(),
            request.suburb(), request.city(), request.postalCode()
        );
        return addressRepository.save(address);
    }

    @Transactional(readOnly = true)
    public List<Address> listOwnedAddresses(UUID customerUserId) {
        CustomerProfile profile = customerProfileRepository.findByUserId(customerUserId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        return addressRepository.findByCustomerId(profile.getId());
    }
}
