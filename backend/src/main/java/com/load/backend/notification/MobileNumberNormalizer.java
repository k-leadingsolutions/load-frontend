package com.load.backend.notification;

import java.util.regex.Pattern;

/**
 * Validates/normalizes a customer-supplied mobile number into the loose shape
 * SMS delivery providers require: digits only, with an optional leading
 * {@code '+'}, and no whitespace or punctuation.
 *
 * <p>This intentionally does NOT attempt full E.164 conversion (e.g.
 * rewriting a leading trunk {@code '0'} into a country code) - that requires
 * knowing the target SMS provider's/country's dialling conventions, which
 * have not been decided yet. It only strips common formatting characters and
 * rejects structurally invalid input early, before either registration or
 * OTP delivery are attempted.
 */
public final class MobileNumberNormalizer {

    private static final Pattern FORMATTING_CHARACTERS = Pattern.compile("[\\s().-]");
    private static final Pattern ALLOWED_NUMBER = Pattern.compile("^\\+?\\d{7,15}$");

    private MobileNumberNormalizer() {
    }

    /**
     * @throws IllegalArgumentException if {@code rawNumber} cannot be normalized
     *     into a plausible phone number shape.
     */
    public static String normalize(String rawNumber) {
        if (rawNumber == null || rawNumber.isBlank()) {
            throw new IllegalArgumentException("Mobile number is required.");
        }
        String stripped = FORMATTING_CHARACTERS.matcher(rawNumber.trim()).replaceAll("");
        if (!ALLOWED_NUMBER.matcher(stripped).matches()) {
            throw new IllegalArgumentException(
                "Mobile number must contain 7-15 digits, with an optional leading '+'.");
        }
        return stripped;
    }
}
