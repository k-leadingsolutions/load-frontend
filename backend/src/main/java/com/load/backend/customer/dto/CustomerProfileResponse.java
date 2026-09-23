package com.load.backend.customer.dto;

import java.util.UUID;

public record CustomerProfileResponse(
    UUID userId,
    String firstName,
    String lastName,
    String mobileNumber,
    String email
) {
}
