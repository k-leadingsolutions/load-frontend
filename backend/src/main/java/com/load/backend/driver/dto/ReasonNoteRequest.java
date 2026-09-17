package com.load.backend.driver.dto;

import com.load.backend.driver.RescheduleReason;
import jakarta.validation.constraints.NotNull;

public record ReasonNoteRequest(
    @NotNull RescheduleReason reason,
    String note
) {
}
