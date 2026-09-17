package com.load.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Self-registration is intentionally CUSTOMER-only. Driver/Operations/Admin accounts are provisioned out-of-band. */
public record RegisterCustomerRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 128) String password,
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank String mobileNumber
) {
}
