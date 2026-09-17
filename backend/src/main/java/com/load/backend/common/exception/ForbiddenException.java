package com.load.backend.common.exception;

/** Caller is authenticated but not permitted to act on the target resource (ownership/role denial). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
