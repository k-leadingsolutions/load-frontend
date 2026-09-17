package com.load.backend.common.exception;

/** Requested resource does not exist, or (for ownership-scoped lookups) does not belong to the caller. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
