package com.load.backend.support;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import com.load.backend.notification.InMemoryOtpDeliveryPort;
import com.load.backend.pos.MockPosReadAdapter;

/**
 * Base class for all Testcontainers-backed integration tests.
 *
 * <p>Root cause of the earlier "connection refused / port unreachable mid-suite"
 * failure: this container was previously declared with JUnit Jupiter's
 * {@code @Testcontainers}/{@code @Container} annotations on a {@code static}
 * field inherited by five different concrete test classes
 * ({@code BookingFlowTest}, {@code DriverAssignmentFlowTest},
 * {@code OperationsFlowTest}, {@code DispatchEligibilityFlowTest},
 * {@code RoleIsolationTest}). With {@code @Container} on a static field, the
 * Testcontainers JUnit extension starts the container in the
 * {@code beforeAll} callback of whichever concrete class runs first, and then
 * stops it again in that same class's {@code afterAll} callback once its
 * tests finish - it manages the container's lifecycle per test class, not
 * once for the whole JVM.
 *
 * <p>Meanwhile all five concrete classes share an identical
 * {@code @SpringBootTest} configuration, so Spring's test context cache
 * reuses a single {@code ApplicationContext} (and therefore a single
 * HikariCP pool) across every one of them. The datasource URL is captured
 * once, in {@link #datasourceProperties}, from whatever port the container
 * happened to be bound to when that shared context was first created. As
 * soon as the first test class to run finished and its {@code afterAll} hook
 * stopped the container, every subsequent test class - still reusing the
 * cached context/pool pointed at the now-dead, previously-mapped port - saw
 * Hikari fail with "Connection to localhost:&lt;old-port&gt; refused", exactly
 * as captured in the earlier failing run's logs. This is a well known pitfall
 * of mixing JUnit-managed container lifecycle with Spring context caching
 * across multiple test classes (see Testcontainers' documented "Singleton
 * containers" pattern).
 *
 * <p>Fix: the container is now a classic Testcontainers "singleton" - started
 * exactly once, manually, in a static initializer, and never explicitly
 * stopped by JUnit. It lives for the entire JVM/test run (its lifetime is
 * bounded by the Ryuk resource reaper / JVM shutdown, not by any single test
 * class), so its mapped port never changes underneath a cached
 * ApplicationContext.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("load")
        .withUsername("load")
        .withPassword("load")
        .withReuse(false);

    static {
        // Singleton container pattern: start once for the whole JVM/test run and
        // deliberately never stop it here - Ryuk (Testcontainers' resource reaper)
        // and JVM shutdown handle cleanup. See class Javadoc for why per-class
        // JUnit-managed start/stop breaks Spring's cached ApplicationContext.
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected MockPosReadAdapter mockPosReadAdapter;

    @Autowired
    protected InMemoryOtpDeliveryPort otpDeliveryPort;

    @AfterEach
    void resetPos() {
        mockPosReadAdapter.reset();
        otpDeliveryPort.reset();
    }

    protected String url(String path) {
        return "http://localhost:" + port + path;
    }
}
