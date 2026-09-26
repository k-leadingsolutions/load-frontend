package com.load.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Regression coverage for the production security review: JWT tamper/expiry
 * rejection, actuator health exposure boundaries, and CORS origin
 * allow-listing. These prove the launch-relevant security properties rather
 * than merely documenting them.
 */
class ProductionSecurityTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    @Value("${load.security.jwt.secret}")
    private String jwtSecret;

    @Test
    void tamperedTokenSignatureIsRejected() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("sec-tampered@example.com");
        String validToken = customer.token();
        // Flip the last character of the signature segment so the signature no longer matches.
        char lastChar = validToken.charAt(validToken.length() - 1);
        char replacement = lastChar == 'A' ? 'B' : 'A';
        String tamperedToken = validToken.substring(0, validToken.length() - 1) + replacement;

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"), HttpMethod.GET, HttpTestUtil.authed(tamperedToken), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void expiredTokenIsRejected() {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        Instant now = Instant.now();
        String expiredToken = Jwts.builder()
            .subject(UUID.randomUUID().toString())
            .claim("email", "expired@example.com")
            .claim("role", Role.CUSTOMER.name())
            .issuedAt(Date.from(now.minusSeconds(7_200)))
            .expiration(Date.from(now.minusSeconds(3_600)))
            .signWith(key)
            .compact();

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"), HttpMethod.GET, HttpTestUtil.authed(expiredToken), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void malformedTokenIsRejected() {
        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"), HttpMethod.GET, HttpTestUtil.authed("not-a-jwt-at-all"), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    @Test
    void validTokenIsStillAccepted() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("sec-valid@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"), HttpMethod.GET, HttpTestUtil.authed(customer.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void actuatorHealthIsPubliclyReadableWithoutLeakingInternals() {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/actuator/health"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        // show-details is restricted; the body must never reveal datasource URLs,
        // credentials or other component-level diagnostics to an anonymous caller.
        assertThat(response.getBody().toLowerCase())
            .doesNotContain("jdbc:")
            .doesNotContain("password")
            .doesNotContain("secret");
    }

    @Test
    void actuatorBeyondHealthIsNotExposed() {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/actuator/env"), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.NOT_FOUND, HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED);
    }

    @Test
    void corsAllowsConfiguredFrontendOrigin() throws Exception {
        HttpResponse<Void> response = sendPreflight("http://localhost:5173");

        assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).contains("http://localhost:5173");
    }

    @Test
    void corsRejectsUnrecognisedOrigin() throws Exception {
        HttpResponse<Void> response = sendPreflight("https://attacker.example.com");

        assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    }

    /**
     * Sends a real CORS preflight (OPTIONS + Origin + Access-Control-Request-Method)
     * using the JDK's modern HttpClient. TestRestTemplate/HttpURLConnection silently
     * strips the Origin and Access-Control-Request-* headers (they are on the JDK's
     * legacy restricted-header list), which would make this test a false negative.
     */
    private HttpResponse<Void> sendPreflight(String origin) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url("/api/customer/orders")))
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
            .header("Origin", origin)
            .header("Access-Control-Request-Method", "GET")
            .build();
        return client.send(request, HttpResponse.BodyHandlers.discarding());
    }
}
