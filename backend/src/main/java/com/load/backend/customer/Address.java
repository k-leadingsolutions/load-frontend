package com.load.backend.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "addresses")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String line1;

    private String line2;

    @Column(nullable = false)
    private String suburb;

    @Column(nullable = false)
    private String city;

    @Column(name = "postal_code", nullable = false)
    private String postalCode;

    /**
     * Identity key derived from the normalized (trimmed, lower-cased)
     * address fields, excluding the user-editable label. Used to detect
     * duplicate address submissions server-side. See
     * {@link #buildNormalizedKey}.
     */
    @Column(name = "normalized_key", nullable = false, length = 600)
    private String normalizedKey;

    /** Last time this address was created, re-submitted as a duplicate, or explicitly selected — drives "most recently used" ordering. */
    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @Version
    private long version;

    protected Address() {
        // JPA
    }

    public Address(UUID customerId, String label, String line1, String line2, String suburb, String city, String postalCode) {
        this.customerId = customerId;
        this.label = label;
        this.line1 = line1;
        this.line2 = line2;
        this.suburb = suburb;
        this.city = city;
        this.postalCode = postalCode;
        this.normalizedKey = buildNormalizedKey(line1, line2, suburb, city, postalCode);
        this.lastUsedAt = Instant.now();
    }

    /**
     * Canonical duplicate-detection key: trimmed, lower-cased line1/line2/
     * suburb/city/postalCode joined with a separator. Deliberately does NOT
     * include the label — two addresses with the same physical location but
     * different labels ("Home" vs "Mom's House") are still the same address.
     */
    public static String buildNormalizedKey(String line1, String line2, String suburb, String city, String postalCode) {
        return String.join(
            "|",
            normalizePart(line1),
            normalizePart(line2),
            normalizePart(suburb),
            normalizePart(city),
            normalizePart(postalCode)
        );
    }

    private static String normalizePart(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    /** Marks this address as just used (freshly created, re-submitted as a duplicate, or explicitly selected in the booking flow). */
    public void touch() {
        this.lastUsedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public String getLabel() {
        return label;
    }

    public String getLine1() {
        return line1;
    }

    public String getLine2() {
        return line2;
    }

    public String getSuburb() {
        return suburb;
    }

    public String getCity() {
        return city;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public String getNormalizedKey() {
        return normalizedKey;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }
}
