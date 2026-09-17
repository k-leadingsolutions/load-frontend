package com.load.backend.common.exception;

/**
 * A requested state transition is not permitted from the entity's current state
 * (e.g. an invalid production stage jump, dispatching an ineligible order, or
 * completing a FAILED Driver assignment directly). Server-side transition
 * policy is authoritative; the frontend guard is UX-only.
 */
public class InvalidTransitionException extends RuntimeException {
    private final String code;

    public InvalidTransitionException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
