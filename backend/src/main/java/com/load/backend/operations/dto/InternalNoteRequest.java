package com.load.backend.operations.dto;

import jakarta.validation.constraints.NotBlank;

public record InternalNoteRequest(@NotBlank String note) {
}
