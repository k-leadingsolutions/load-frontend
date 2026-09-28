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

    /**
     * Creates a new address, unless the customer already has one with the
     * same normalized identity (line1/line2/suburb/city/postalCode — label is
     * never part of the identity), in which case the existing row is reused
     * (and its recency touched) instead of inserting a duplicate.
     */
    @Transactional
    public Address createAddress(UUID customerUserId, CreateAddressRequest request) {
        CustomerProfile profile = customerProfileRepository.findByUserId(customerUserId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));

        String normalizedKey = Address.buildNormalizedKey(
            request.line1(), request.line2(), request.suburb(), request.city(), request.postalCode()
        );

        Address existing = addressRepository
            .findFirstByCustomerIdAndNormalizedKeyOrderByLastUsedAtDesc(profile.getId(), normalizedKey)
            .orElse(null);
        if (existing != null) {
            existing.touch();
            return addressRepository.save(existing);
        }

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
        return addressRepository.findByCustomerIdOrderByLastUsedAtDesc(profile.getId());
    }

    /** Marks an address as just used (e.g. selected as pickup/delivery in the booking flow), updating "most recently used" ordering. */
    @Transactional
    public Address touchLastUsed(UUID customerUserId, UUID addressId) {
        CustomerProfile profile = customerProfileRepository.findByUserId(customerUserId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        Address address = addressRepository.findByIdAndCustomerId(addressId, profile.getId())
            .orElseThrow(() -> new NotFoundException("Address not found."));
        address.touch();
        return addressRepository.save(address);
    }
}
