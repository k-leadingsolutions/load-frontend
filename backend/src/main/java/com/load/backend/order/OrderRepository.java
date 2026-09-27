package com.load.backend.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCustomerId(UUID customerId);

    @Query("select o.orderNumber from Order o where o.id = :id")
    Optional<String> findOrderNumberById(@Param("id") UUID id);
}
