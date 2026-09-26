package com.load.backend.operations.dto;

/**
 * A single Operations dashboard metric tile. Deliberately excludes any
 * revenue/financial figures — those remain an Admin/analytics concern outside
 * Operations' role boundary (see {@code mockOperationsMetrics} on the frontend).
 */
public record DashboardMetricResponse(String id, String label, String value, String changeLabel) {
}
