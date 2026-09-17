package com.load.backend.customer.dto;

import com.load.backend.customer.Address;
import java.util.UUID;

public record AddressResponse(
    UUID id, String label, String line1, String line2, String suburb, String city, String postalCode
) {
    public static AddressResponse from(Address address) {
        return new AddressResponse(
            address.getId(), address.getLabel(), address.getLine1(), address.getLine2(),
            address.getSuburb(), address.getCity(), address.getPostalCode()
        );
    }
}
