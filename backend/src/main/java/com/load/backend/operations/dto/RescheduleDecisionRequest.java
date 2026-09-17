package com.load.backend.operations.dto;

import jakarta.validation.constraints.Pattern;

public record RescheduleDecisionRequest(
    @Pattern(regexp = "APPROVED|REJECTED") String decision,
    String note
) {
}
