package com.load.backend.pos;

public record PosOrderRecord(
    String externalOrderId,
    String posStatus
) {
}
