package com.load.backend.customer;

import com.load.backend.auth.User;
import com.load.backend.auth.UserRepository;
import com.load.backend.common.exception.NotFoundException;
import com.load.backend.customer.dto.CustomerProfileResponse;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only projection of the authenticated Customer's own profile. Never trusts a caller-supplied id. */
@Service
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;
    private final UserRepository userRepository;

    public CustomerProfileService(CustomerProfileRepository customerProfileRepository, UserRepository userRepository) {
        this.customerProfileRepository = customerProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getOwnProfile(UUID userId) {
        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Customer profile not found."));

        return new CustomerProfileResponse(
            userId, profile.getFirstName(), profile.getLastName(), profile.getMobileNumber(), user.getEmail()
        );
    }
}
