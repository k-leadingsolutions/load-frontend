package com.load.backend.support;

import com.load.backend.auth.JwtService;
import com.load.backend.auth.Role;
import com.load.backend.auth.User;
import com.load.backend.auth.UserRepository;
import com.load.backend.customer.Address;
import com.load.backend.customer.AddressRepository;
import com.load.backend.customer.CustomerProfile;
import com.load.backend.customer.CustomerProfileRepository;
import com.load.backend.driver.Driver;
import com.load.backend.driver.DriverRepository;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Test-only helper for provisioning users of each role and issuing JWTs directly (bypassing HTTP registration, since only CUSTOMER self-registration exists). */
@Component
public class TestUserFactory {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CustomerProfileRepository customerProfileRepository;
    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private DriverRepository driverRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;

    @Transactional
    public ProvisionedCustomer createCustomer(String email) {
        User user = userRepository.save(new User(email, passwordEncoder.encode("Password123!"), Role.CUSTOMER));
        CustomerProfile profile = customerProfileRepository.save(new CustomerProfile(user.getId(), "Test", "Customer", "0821234567"));
        Address address = addressRepository.save(new Address(profile.getId(), "Home", "1 Main Street", null, "Suburb", "Cape Town", "8000"));
        String token = jwtService.issueToken(user.getId(), user.getEmail(), Role.CUSTOMER);
        return new ProvisionedCustomer(user.getId(), token, address.getId());
    }

    @Transactional
    public ProvisionedDriver createDriver(String email) {
        User user = userRepository.save(new User(email, passwordEncoder.encode("Password123!"), Role.DRIVER));
        Driver driver = driverRepository.save(new Driver(user.getId(), "Test Driver"));
        String token = jwtService.issueToken(user.getId(), user.getEmail(), Role.DRIVER);
        return new ProvisionedDriver(user.getId(), driver.getId(), token);
    }

    @Transactional
    public ProvisionedUser createOperationsUser(String email) {
        User user = userRepository.save(new User(email, passwordEncoder.encode("Password123!"), Role.OPERATIONS));
        String token = jwtService.issueToken(user.getId(), user.getEmail(), Role.OPERATIONS);
        return new ProvisionedUser(user.getId(), token);
    }

    @Transactional
    public ProvisionedUser createAdminUser(String email) {
        User user = userRepository.save(new User(email, passwordEncoder.encode("Password123!"), Role.ADMIN));
        String token = jwtService.issueToken(user.getId(), user.getEmail(), Role.ADMIN);
        return new ProvisionedUser(user.getId(), token);
    }

    public record ProvisionedCustomer(UUID userId, String token, UUID addressId) {
    }

    public record ProvisionedDriver(UUID userId, UUID driverId, String token) {
    }

    public record ProvisionedUser(UUID userId, String token) {
    }
}
