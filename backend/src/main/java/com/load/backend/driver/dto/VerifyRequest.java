package com.load.backend.driver.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyRequest(@NotBlank String code) {
}
