package com.load.backend.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class MobileNumberNormalizerTest {

    @Test
    void stripsCommonFormattingCharacters() {
        assertThat(MobileNumberNormalizer.normalize("+27 (82) 123-4567")).isEqualTo("+27821234567");
        assertThat(MobileNumberNormalizer.normalize("082 123 4567")).isEqualTo("0821234567");
    }

    @Test
    void rejectsBlankInput() {
        assertThatThrownBy(() -> MobileNumberNormalizer.normalize(" "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNonNumericContent() {
        assertThatThrownBy(() -> MobileNumberNormalizer.normalize("not-a-number"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsTooShortNumber() {
        assertThatThrownBy(() -> MobileNumberNormalizer.normalize("12345"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
