package com.load.backend.operations.dto;

import com.load.backend.order.QuantityReviewStatus;
import jakarta.validation.constraints.NotNull;

public record QuantityReviewRequest(@NotNull QuantityReviewStatus status) {
}
