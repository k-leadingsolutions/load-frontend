package com.load.backend.driver;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverAssignmentRepository extends JpaRepository<DriverAssignment, UUID> {
    List<DriverAssignment> findByDriverId(UUID driverId);

    List<DriverAssignment> findByOrderId(UUID orderId);
}
