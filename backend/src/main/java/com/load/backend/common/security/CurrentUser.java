package com.load.backend.common.security;

import com.load.backend.auth.UserPrincipal;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Small helper to fetch the authenticated principal's real userId - never trust a request-supplied id. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static UUID userId() {
        return principal().getUserId();
    }

    public static UserPrincipal principal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new IllegalStateException("No authenticated principal available.");
        }
        return principal;
    }
}
