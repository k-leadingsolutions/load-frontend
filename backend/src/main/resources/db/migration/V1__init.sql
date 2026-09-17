-- LOAD backend Pass 1 core schema.

CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE customer_profiles (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
    first_name      VARCHAR(255) NOT NULL,
    last_name       VARCHAR(255) NOT NULL,
    mobile_number   VARCHAR(64)  NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE addresses (
    id              UUID PRIMARY KEY,
    customer_id     UUID NOT NULL REFERENCES customer_profiles(id),
    label           VARCHAR(255) NOT NULL,
    line1           VARCHAR(255) NOT NULL,
    line2           VARCHAR(255),
    suburb          VARCHAR(255) NOT NULL,
    city            VARCHAR(255) NOT NULL,
    postal_code     VARCHAR(32)  NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE drivers (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id                      UUID PRIMARY KEY,
    customer_id             UUID NOT NULL REFERENCES users(id),
    status                  VARCHAR(32) NOT NULL,
    fulfilment_type         VARCHAR(32) NOT NULL,
    pickup_address_id       UUID NOT NULL REFERENCES addresses(id),
    pickup_window_date      VARCHAR(64) NOT NULL,
    pickup_window_label     VARCHAR(255) NOT NULL,
    delivery_address_id     UUID REFERENCES addresses(id),
    delivery_window_date    VARCHAR(64),
    delivery_window_label   VARCHAR(255),
    estimated_total         NUMERIC(12,2) NOT NULL,
    payment_status          VARCHAR(32) NOT NULL,
    invoice_status          VARCHAR(32) NOT NULL,
    final_invoice_total     NUMERIC(12,2),
    external_pos_order_id   VARCHAR(255),
    external_invoice_id     VARCHAR(255),
    received_at_store       BOOLEAN NOT NULL DEFAULT FALSE,
    intake_weight_kg        NUMERIC(8,3),
    created_at              TIMESTAMPTZ NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL,
    version                 BIGINT NOT NULL DEFAULT 0,
    -- STORE_COLLECTION orders must never carry synthetic delivery data.
    CONSTRAINT chk_orders_store_collection_no_delivery CHECK (
        fulfilment_type <> 'STORE_COLLECTION'
        OR (delivery_address_id IS NULL AND delivery_window_date IS NULL AND delivery_window_label IS NULL)
    )
);

CREATE TABLE order_service_selections (
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id  VARCHAR(255) NOT NULL,
    quantity    INTEGER NOT NULL,
    unit_label  VARCHAR(64) NOT NULL
);

CREATE TABLE order_intake_notes (
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    note_index  INTEGER NOT NULL,
    note        VARCHAR(2000),
    PRIMARY KEY (order_id, note_index)
);

CREATE TABLE driver_assignments (
    id                          UUID PRIMARY KEY,
    driver_id                   UUID NOT NULL REFERENCES drivers(id),
    order_id                    UUID NOT NULL REFERENCES orders(id),
    stop_index                  INTEGER NOT NULL,
    stop_type                   VARCHAR(16) NOT NULL,
    stop_status                 VARCHAR(32) NOT NULL,
    verification_method         VARCHAR(16),
    verification_status         VARCHAR(16),
    verification_code_hash      VARCHAR(255),
    failure_reason              VARCHAR(32),
    failure_note                VARCHAR(1000),
    reschedule_reason           VARCHAR(32),
    reschedule_note             VARCHAR(1000),
    operations_decision         VARCHAR(16),
    operations_decision_note    VARCHAR(1000),
    operations_decision_at      TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL,
    updated_at                  TIMESTAMPTZ NOT NULL,
    version                     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY,
    order_id            UUID NOT NULL UNIQUE REFERENCES orders(id),
    external_invoice_id VARCHAR(255),
    status              VARCHAR(32) NOT NULL,
    final_total         NUMERIC(12,2),
    retrieved_at        TIMESTAMPTZ NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE payments (
    id                  UUID PRIMARY KEY,
    order_id            UUID NOT NULL REFERENCES orders(id),
    amount              NUMERIC(12,2) NOT NULL,
    status              VARCHAR(32) NOT NULL,
    provider_reference  VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_driver_assignments_driver_id ON driver_assignments(driver_id);
CREATE INDEX idx_driver_assignments_order_id ON driver_assignments(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
