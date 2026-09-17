package com.load.backend.operations;

import static org.assertj.core.api.Assertions.assertThat;

import com.load.backend.order.OrderStatus;
import org.junit.jupiter.api.Test;

class ProductionTransitionPolicyTest {

    private final ProductionTransitionPolicy policy = new ProductionTransitionPolicy();

    @Test
    void advancesLinearlyThroughAllProductionStages() {
        assertThat(policy.nextStage(OrderStatus.RECEIVED_AT_STORE)).isEqualTo(OrderStatus.SORTING);
        assertThat(policy.nextStage(OrderStatus.SORTING)).isEqualTo(OrderStatus.WASHING);
        assertThat(policy.nextStage(OrderStatus.WASHING)).isEqualTo(OrderStatus.DRYING);
        assertThat(policy.nextStage(OrderStatus.DRYING)).isEqualTo(OrderStatus.IRONING);
        assertThat(policy.nextStage(OrderStatus.IRONING)).isEqualTo(OrderStatus.QUALITY_CHECK);
        assertThat(policy.nextStage(OrderStatus.QUALITY_CHECK)).isEqualTo(OrderStatus.PACKING);
        assertThat(policy.nextStage(OrderStatus.PACKING)).isEqualTo(OrderStatus.READY_FOR_DISPATCH);
    }

    @Test
    void finalStageDoesNotAdvanceFurther() {
        assertThat(policy.isFinalStage(OrderStatus.READY_FOR_DISPATCH)).isTrue();
        assertThat(policy.nextStage(OrderStatus.READY_FOR_DISPATCH)).isEqualTo(OrderStatus.READY_FOR_DISPATCH);
    }
}
