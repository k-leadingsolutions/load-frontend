-- Human-friendly, immutable order numbers (format: LD##### e.g. LD10482).
--
-- The UUID `orders.id` column remains the sole primary key / foreign key /
-- API routing identifier everywhere. `order_number` is purely a display
-- identifier for humans (Customer, Operations, Driver UIs).
--
-- A PostgreSQL sequence guarantees collision-safe, monotonically increasing
-- numbers under concurrent inserts (nextval() is atomic and never blocks on
-- or is rolled back by the owning transaction). Starting at 10000 gives a
-- 5-digit number immediately; the format naturally grows beyond 5 digits
-- once the sequence passes 99999 - no padding/truncation is applied.
CREATE SEQUENCE order_number_seq START WITH 10000 INCREMENT BY 1;

ALTER TABLE orders
    ADD COLUMN order_number VARCHAR(20);

-- Backfill any pre-existing rows. Each matched row consumes exactly one
-- sequence value (nextval() is evaluated once per updated row), so every
-- existing order safely gets a unique, immutable number and the sequence
-- naturally continues on from there for all future inserts.
UPDATE orders
SET order_number = 'LD' || nextval('order_number_seq')
WHERE order_number IS NULL;

ALTER TABLE orders
    ALTER COLUMN order_number SET NOT NULL;

ALTER TABLE orders
    ADD CONSTRAINT uq_orders_order_number UNIQUE (order_number);

-- Every future insert gets its order_number generated server-side, for free,
-- without the application needing to pre-fetch a sequence value.
ALTER TABLE orders
    ALTER COLUMN order_number SET DEFAULT ('LD' || nextval('order_number_seq'));
