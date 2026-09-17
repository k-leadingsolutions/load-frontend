package com.load.backend.customer.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateAddressRequest(
    @NotBlank String label,
    @NotBlank String line1,
    String line2,
    @NotBlank String suburb,
    @NotBlank String city,
    @NotBlank String postalCode
) {
}
