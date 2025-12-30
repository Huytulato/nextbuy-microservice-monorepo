# ADR 002: Shared Middleware Package

## Status
Accepted

## Context
Each service was duplicating middleware configuration:
- CORS setup
- Express configuration
- Error handling
- Health checks

This led to:
- Code duplication
- Inconsistent configurations
- Difficult maintenance

## Decision
Create a shared middleware package (`@packages/middleware`) that provides:
- Centralized CORS configuration
- Express app setup helper
- Standard health check endpoints
- Common middleware utilities

## Consequences

### Positive
- Single source of truth for middleware
- Consistent configuration across services
- Easier to update and maintain
- Reduced code duplication

### Negative
- Services must use shared package
- Less flexibility for service-specific needs
- Requires coordination for changes

## Implementation
- Created `packages/middleware/` with:
  - `cors.config.ts`: CORS configuration
  - `express.config.ts`: Express setup
  - `health-check.ts`: Health check endpoints
- Updated services to use shared middleware

