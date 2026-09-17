package com.load.backend.operations.dto;

import com.load.backend.driver.StopType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignDriverRequest(@NotNull UUID driverId, @NotNull StopType stopType) {
}
