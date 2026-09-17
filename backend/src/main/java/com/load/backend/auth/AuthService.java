package com.load.backend.auth;

import com.load.backend.auth.dto.AuthResponse;
import com.load.backend.auth.dto.LoginRequest;
import com.load.backend.auth.dto.RegisterCustomerRequest;
import com.load.backend.customer.CustomerProfile;
import com.load.backend.customer.CustomerProfileRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
        UserRepository userRepository,
        CustomerProfileRepository customerProfileRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse registerCustomer(RegisterCustomerRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        User user = new User(request.email(), passwordEncoder.encode(request.password()), Role.CUSTOMER);
        user = userRepository.save(user);

        CustomerProfile profile = new CustomerProfile(
            user.getId(), request.firstName(), request.lastName(), request.mobileNumber()
        );
        customerProfileRepository.save(profile);

        String token = jwtService.issueToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getEmail(), user.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (Exception ex) {
            throw new BadCredentialsException("Invalid credentials.");
        }

        User user = userRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials."));

        String token = jwtService.issueToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getEmail(), user.getRole());
    }
}
