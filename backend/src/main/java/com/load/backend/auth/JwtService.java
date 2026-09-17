package com.load.backend.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Stateless JWT issuance/validation. Chosen as the "authenticated session/token
 * approach appropriate to current architecture" for a SPA frontend calling a
 * stateless REST API. Tokens embed userId + role only - never a client-trusted
 * customerId used for authorization (ownership is always re-derived server-side
 * from the token's subject at request time).
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirySeconds;

    public JwtService(
        @Value("${load.security.jwt.secret}") String secret,
        @Value("${load.security.jwt.expiry-seconds:3600}") long expirySeconds
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirySeconds = expirySeconds;
    }

    public String issueToken(UUID userId, String email, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expirySeconds)))
            .signWith(key)
            .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
