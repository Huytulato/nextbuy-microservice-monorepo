# ADR 001: Service Layer Pattern

## Status
Accepted

## Context
The codebase had business logic directly in controllers, making it difficult to:
- Test business logic in isolation
- Reuse business logic across different entry points
- Maintain and refactor code
- Follow separation of concerns

## Decision
We will implement a three-layer architecture:
1. **Controllers**: Handle HTTP requests/responses only
2. **Services**: Contain business logic
3. **Repositories**: Handle data access

## Consequences

### Positive
- Clear separation of concerns
- Easier to test (can test services without HTTP)
- Business logic can be reused
- Better code organization
- Easier to maintain

### Negative
- More files and layers to manage
- Slight increase in code complexity
- Requires discipline to maintain separation

## Implementation
- Created base classes: `BaseController`, `BaseService`, `BaseRepository`
- Refactored `product-service` as template
- Standardized folder structure across services

