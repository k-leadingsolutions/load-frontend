package com.load.backend.order;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class OrderServiceSelection {

    @Column(name = "service_id", nullable = false)
    private String serviceId;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_label", nullable = false)
    private String unitLabel;

    protected OrderServiceSelection() {
        // JPA
    }

    public OrderServiceSelection(String serviceId, int quantity, String unitLabel) {
        this.serviceId = serviceId;
        this.quantity = quantity;
        this.unitLabel = unitLabel;
    }

    public String getServiceId() {
        return serviceId;
    }

    public int getQuantity() {
        return quantity;
    }

    public String getUnitLabel() {
        return unitLabel;
    }
}
