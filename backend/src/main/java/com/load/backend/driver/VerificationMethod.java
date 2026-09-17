package com.load.backend.driver;

/** Kept separate from authentication OTP. Extensible to QR without making the product decision permanent. */
public enum VerificationMethod {
    OTP,
    QR
}
