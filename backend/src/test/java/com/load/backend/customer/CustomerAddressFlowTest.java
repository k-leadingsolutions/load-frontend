package com.load.backend.customer;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.customer.dto.AddressResponse;
import com.load.backend.customer.dto.CreateAddressRequest;
import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Regression coverage for saved-address duplicate protection and the
 * "most recently used" recency model backing the booking screen's compact
 * address picker.
 */
class CustomerAddressFlowTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    private ResponseEntity<AddressResponse> create(String token, CreateAddressRequest request) {
        return restTemplate.exchange(
            url("/api/customer/addresses"),
            HttpMethod.POST,
            HttpTestUtil.authed(token, request),
            AddressResponse.class
        );
    }

    private ResponseEntity<AddressResponse[]> list(String token) {
        return restTemplate.exchange(
            url("/api/customer/addresses"),
            HttpMethod.GET,
            HttpTestUtil.authed(token),
            AddressResponse[].class
        );
    }

    @Test
    void submittingAnExactDuplicateReusesTheExistingAddressInsteadOfCreatingAnotherRow() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("dupe-exact@example.com");

        CreateAddressRequest request = new CreateAddressRequest("Home", "10 Long Street", null, "Gardens", "Cape Town", "8001");
        ResponseEntity<AddressResponse> first = create(customer.token(), request);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<AddressResponse> second = create(customer.token(), request);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().id()).isEqualTo(first.getBody().id());

        ResponseEntity<AddressResponse[]> listed = list(customer.token());
        // The pre-provisioned "Home" test address plus this one new (deduped) address — never a third row.
        assertThat(listed.getBody()).hasSize(2);
    }

    @Test
    void duplicateDetectionIsCaseAndWhitespaceInsensitiveAndIgnoresLabel() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("dupe-fuzzy@example.com");

        ResponseEntity<AddressResponse> first = create(
            customer.token(),
            new CreateAddressRequest("Home", "10 Long Street", null, "Gardens", "Cape Town", "8001")
        );
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Different label, different case, extra whitespace — same physical address.
        ResponseEntity<AddressResponse> second = create(
            customer.token(),
            new CreateAddressRequest("Work", "  10 LONG STREET  ", null, " gardens ", " CAPE TOWN ", " 8001 ")
        );
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().id()).isEqualTo(first.getBody().id());
        // The reused row keeps its original label — the duplicate submission does not rename it.
        assertThat(second.getBody().label()).isEqualTo("Home");

        ResponseEntity<AddressResponse[]> listed = list(customer.token());
        assertThat(listed.getBody()).hasSize(2);
    }

    @Test
    void distinctAddressesAreNeverMergedIntoOneRow() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("distinct-addr@example.com");

        ResponseEntity<AddressResponse> first = create(
            customer.token(),
            new CreateAddressRequest("Home", "10 Long Street", null, "Gardens", "Cape Town", "8001")
        );
        ResponseEntity<AddressResponse> second = create(
            customer.token(),
            new CreateAddressRequest("Office", "177 Oxford Road", null, "Rosebank", "Johannesburg", "2196")
        );

        assertThat(second.getBody().id()).isNotEqualTo(first.getBody().id());
        ResponseEntity<AddressResponse[]> listed = list(customer.token());
        assertThat(listed.getBody()).hasSize(3);
    }

    @Test
    void selectingAnAddressBumpsItToTheFrontOfMostRecentlyUsedOrdering() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("recency@example.com");

        ResponseEntity<AddressResponse> second = create(
            customer.token(),
            new CreateAddressRequest("Office", "177 Oxford Road", null, "Rosebank", "Johannesburg", "2196")
        );
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Right after creation, the most recently created address (Office) sorts first.
        List<AddressResponse> listedAfterCreate = List.of(list(customer.token()).getBody());
        assertThat(listedAfterCreate.get(0).id()).isEqualTo(second.getBody().id());

        // Selecting the original "Home" test address should bump it back to the front.
        ResponseEntity<AddressResponse> selectResponse = restTemplate.exchange(
            url("/api/customer/addresses/" + customer.addressId() + "/select"),
            HttpMethod.POST,
            HttpTestUtil.authed(customer.token()),
            AddressResponse.class
        );
        assertThat(selectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(selectResponse.getBody().id()).isEqualTo(customer.addressId());

        List<AddressResponse> listedAfterSelect = List.of(list(customer.token()).getBody());
        assertThat(listedAfterSelect.get(0).id()).isEqualTo(customer.addressId());
    }

    @Test
    void selectingAnAddressBelongingToAnotherCustomerIsRejected() {
        TestUserFactory.ProvisionedCustomer owner = testUserFactory.createCustomer("addr-select-owner@example.com");
        TestUserFactory.ProvisionedCustomer intruder = testUserFactory.createCustomer("addr-select-intruder@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/addresses/" + owner.addressId() + "/select"),
            HttpMethod.POST,
            HttpTestUtil.authed(intruder.token()),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
