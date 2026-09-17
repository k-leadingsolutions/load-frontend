package com.load.backend.auth;

/** The four LOAD roles. Backend is authoritative; the frontend guard is UX/defence-in-depth only. */
public enum Role {
    CUSTOMER,
    DRIVER,
    OPERATIONS,
    ADMIN
}
