-- Adds a normalized-identity key (for duplicate detection, independent of the
-- user-editable label) and a last-used-at timestamp (for "most recently used
-- addresses" ordering) to addresses.
--
-- Deliberately no UNIQUE constraint on (customer_id, normalized_key): the
-- task requires NOT deleting/merging pre-existing historical duplicates
-- automatically, and a unique index would fail to create if any already
-- exist. Duplicate protection for new/updated rows is enforced in
-- CustomerAddressService instead.
ALTER TABLE addresses ADD COLUMN normalized_key VARCHAR(600);
ALTER TABLE addresses ADD COLUMN last_used_at TIMESTAMP;

UPDATE addresses
SET normalized_key = lower(trim(line1)) || '|' || lower(trim(coalesce(line2, ''))) || '|' ||
                      lower(trim(suburb)) || '|' || lower(trim(city)) || '|' || lower(trim(postal_code))
WHERE normalized_key IS NULL;

UPDATE addresses SET last_used_at = now() WHERE last_used_at IS NULL;

ALTER TABLE addresses ALTER COLUMN normalized_key SET NOT NULL;
ALTER TABLE addresses ALTER COLUMN last_used_at SET NOT NULL;

CREATE INDEX idx_addresses_customer_normalized_key ON addresses (customer_id, normalized_key);
CREATE INDEX idx_addresses_customer_last_used_at ON addresses (customer_id, last_used_at DESC);
