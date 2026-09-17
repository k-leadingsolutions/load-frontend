package com.load.backend.common.exception;

public record ApiError(String code, String message, int status) {
}
