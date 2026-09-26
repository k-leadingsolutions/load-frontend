package com.load.backend.operations.dto;

import jakarta.validation.constraints.NotNull;

public record QualityCheckRequest(@NotNull Boolean passed, String notes) {
}
