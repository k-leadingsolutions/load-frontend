package com.load.backend.operations.dto;

import java.math.BigDecimal;

public record StoreIntakeRequest(BigDecimal weightKg, String notes) {
}
