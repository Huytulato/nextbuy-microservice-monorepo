# ADR 003: API Contracts Package

## Status
Accepted

## Context
Services were communicating without defined contracts:
- No type safety for inter-service calls
- Inconsistent request/response formats
- Difficult to track API changes
- No versioning strategy

## Decision
Create a shared contracts package (`@packages/contracts`) that defines:
- API request/response types
- Event schemas for Kafka
- Versioned contracts (v1, v2, etc.)

## Consequences

### Positive
- Type safety for inter-service communication
- Clear API contracts
- Easier to track breaking changes
- Better IDE support and autocomplete

### Negative
- Requires coordination for contract changes
- Additional package to maintain
- Must update contracts when APIs change

## Implementation
- Created `packages/contracts/` with:
  - `api/v1/`: API contracts for each service
  - `events/`: Event schemas for Kafka
- Services use contracts for type safety

