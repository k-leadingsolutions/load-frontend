package com.load.backend.customer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, UUID> {
    List<Address> findByCustomerIdOrderByLastUsedAtDesc(UUID customerId);

    Optional<Address> findByIdAndCustomerId(UUID id, UUID customerId);

    /** Looks up an existing address for this customer with the same normalized identity (duplicate detection). Most recently used wins if, improbably, more than one historical duplicate exists. */
    Optional<Address> findFirstByCustomerIdAndNormalizedKeyOrderByLastUsedAtDesc(UUID customerId, String normalizedKey);
}
