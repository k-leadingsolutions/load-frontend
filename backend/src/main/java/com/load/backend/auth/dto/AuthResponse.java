package com.load.backend.auth.dto;

import com.load.backend.auth.Role;

public record AuthResponse(
    String token,
    String email,
    Role role
) {
}
