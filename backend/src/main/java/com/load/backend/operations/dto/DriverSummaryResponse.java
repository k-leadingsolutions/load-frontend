package com.load.backend.operations.dto;

import com.load.backend.driver.Driver;
import java.util.UUID;

/**
 * A real, registered Driver Operations can assign to a stop. Never a
 * hardcoded/demo driver — always sourced from the persisted {@link Driver}
 * table. "Available" currently means "a real registered Driver account";
 * there is no separate on-shift/capacity tracking system yet.
 */
public record DriverSummaryResponse(UUID id, String name) {

    public static DriverSummaryResponse from(Driver driver) {
        return new DriverSummaryResponse(driver.getId(), driver.getName());
    }
}
