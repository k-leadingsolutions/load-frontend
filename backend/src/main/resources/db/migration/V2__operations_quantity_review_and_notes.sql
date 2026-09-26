ALTER TABLE orders
    ADD COLUMN quantity_review_status VARCHAR(16) NOT NULL DEFAULT 'PENDING';

CREATE TABLE order_internal_notes (
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    note_index  INTEGER NOT NULL,
    note        VARCHAR(2000),
    PRIMARY KEY (order_id, note_index)
);
