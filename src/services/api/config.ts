/**
 * Base URL for the Spring Boot backend. Configurable via Vite env var so the
 * same build can target different backend deployments without code changes.
 */
export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
