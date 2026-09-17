package com.load.backend.pos;

/** Thrown by a {@link PosReadPort} implementation when POS is unreachable. Never mutates any state. */
public class PosUnavailableException extends RuntimeException {
    public PosUnavailableException(String message) {
        super(message);
    }
}
