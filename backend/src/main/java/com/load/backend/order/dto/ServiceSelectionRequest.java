package com.load.backend.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ServiceSelectionRequest(
    @NotBlank String serviceId,
    @Min(1) int quantity,
    @NotBlank String unitLabel
) {
}
