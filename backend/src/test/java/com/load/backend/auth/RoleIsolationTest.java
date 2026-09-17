package com.load.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.support.AbstractIntegrationTest;
import com.load.backend.support.HttpTestUtil;
import com.load.backend.support.TestUserFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Cross-role endpoint isolation: no role may reach another role's endpoint namespace. */
class RoleIsolationTest extends AbstractIntegrationTest {

    @Autowired
    private TestUserFactory testUserFactory;

    @Test
    void customerCannotAccessDriverEndpoints() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("role-customer-1@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/driver/assignments"), HttpMethod.GET, HttpTestUtil.authed(customer.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void customerCannotAccessOperationsEndpoints() {
        TestUserFactory.ProvisionedCustomer customer = testUserFactory.createCustomer("role-customer-2@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders"), HttpMethod.GET, HttpTestUtil.authed(customer.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void driverCannotAccessCustomerEndpoints() {
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("role-driver-1@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/customer/orders"), HttpMethod.GET, HttpTestUtil.authed(driver.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void driverCannotAccessOperationsEndpoints() {
        TestUserFactory.ProvisionedDriver driver = testUserFactory.createDriver("role-driver-2@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders"), HttpMethod.GET, HttpTestUtil.authed(driver.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void operationsCannotAccessAdminEndpoints() {
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("role-ops-1@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/admin/anything"), HttpMethod.GET, HttpTestUtil.authed(ops.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void operationsCanAccessOperationsEndpoints() {
        TestUserFactory.ProvisionedUser ops = testUserFactory.createOperationsUser("role-ops-2@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders"), HttpMethod.GET, HttpTestUtil.authed(ops.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void adminCanAccessOperationsEndpoints() {
        TestUserFactory.ProvisionedUser admin = testUserFactory.createAdminUser("role-admin-1@example.com");

        ResponseEntity<String> response = restTemplate.exchange(
            url("/api/operations/orders"), HttpMethod.GET, HttpTestUtil.authed(admin.token()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/api/customer/orders"), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
}
