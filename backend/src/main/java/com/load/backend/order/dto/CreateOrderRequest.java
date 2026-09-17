package com.load.backend.order.dto;

import com.load.backend.order.FulfilmentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull FulfilmentType fulfilmentType,
    @NotNull UUID pickupAddressId,
    @NotBlank String pickupWindowDate,
    @NotBlank String pickupWindowLabel,
    /** Required only when fulfilmentType == DELIVERY. Validated in the service layer since it's conditional. */
    UUID deliveryAddressId,
    String deliveryWindowDate,
    String deliveryWindowLabel,
    @NotEmpty List<@Valid ServiceSelectionRequest> services,
    @NotNull @DecimalMin(value = "0", inclusive = true) BigDecimal estimatedTotal
) {
}
