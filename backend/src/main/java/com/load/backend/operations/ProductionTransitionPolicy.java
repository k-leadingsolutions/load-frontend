package com.load.backend.operations;

import com.load.backend.order.OrderStatus;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Maintainable production transition policy. For Pass 1 this preserves the
 * current launch behaviour (a fixed linear sequence) without overengineering a
 * full workflow engine - later service-aware progression can replace the fixed
 * list with a per-fulfilment/per-service lookup behind this same interface.
 */
@Component
public class ProductionTransitionPolicy {

    private static final List<OrderStatus> PRODUCTION_STAGES = List.of(
        OrderStatus.RECEIVED_AT_STORE,
        OrderStatus.SORTING,
        OrderStatus.WASHING,
        OrderStatus.DRYING,
        OrderStatus.IRONING,
        OrderStatus.QUALITY_CHECK,
        OrderStatus.PACKING,
        OrderStatus.READY_FOR_DISPATCH
    );

    public boolean isProductionStage(OrderStatus status) {
        return PRODUCTION_STAGES.contains(status);
    }

    /** Returns the next stage, or the same stage if already at the final one (READY_FOR_DISPATCH). */
    public OrderStatus nextStage(OrderStatus current) {
        int index = PRODUCTION_STAGES.indexOf(current);
        if (index == -1) {
            return PRODUCTION_STAGES.get(0);
        }
        return PRODUCTION_STAGES.get(Math.min(index + 1, PRODUCTION_STAGES.size() - 1));
    }

    public boolean isFinalStage(OrderStatus status) {
        return status == OrderStatus.READY_FOR_DISPATCH;
    }
}
