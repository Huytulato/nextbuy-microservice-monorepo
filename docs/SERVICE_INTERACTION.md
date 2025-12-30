# Service Interaction Patterns

## Overview
This document describes how services interact with each other in the NextBuy platform.

## Interaction Types

### 1. Synchronous HTTP Calls (via API Gateway)

```
Client -> API Gateway -> Service
```

**Use Cases**:
- User-initiated actions
- Real-time data retrieval
- Immediate responses required

**Example**: User creates an order
```
User -> API Gateway -> Order Service -> Product Service (validate) -> Order Service (create)
```

### 2. Asynchronous Events (via Kafka)

```
Service A -> Kafka -> Kafka Service -> Service B
```

**Use Cases**:
- Notifications
- Analytics
- Non-critical updates
- Event sourcing

**Example**: Product created notification
```
Product Service -> Kafka (product.created) -> Kafka Service -> Admin Service (notification)
```

### 3. Direct Service-to-Service (Internal APIs)

```
Service A -> Service B (internal endpoint)
```

**Use Cases**:
- Service clients for validation
- Data fetching between services
- Internal operations

**Example**: Order service validates product
```
Order Service -> Product Client -> Product Service (internal API)
```

## Service Dependencies

### Order Service
- **Depends on**:
  - Auth Service: Validate user
  - Product Service: Validate products, update stock
  - Seller Service: Get shop information

### Product Service
- **Depends on**:
  - Auth Service: Validate seller
  - Seller Service: Validate shop ownership

### Seller Service
- **Depends on**:
  - Auth Service: Validate seller authentication

### Admin Service
- **Depends on**:
  - Auth Service: Validate admin
  - Product Service: Get products for moderation
  - Seller Service: Get sellers for verification

## Communication Flow Examples

### Example 1: Create Order

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant OrderService
    participant ProductService
    participant AuthService
    participant Kafka

    User->>Gateway: POST /order/api/create-payment-session
    Gateway->>OrderService: Forward request
    OrderService->>AuthService: Validate user (internal)
    AuthService-->>OrderService: User valid
    OrderService->>ProductService: Validate products (internal)
    ProductService-->>OrderService: Products valid
    OrderService-->>Gateway: Payment session created
    Gateway-->>User: Session ID
    
    User->>Gateway: Complete payment
    Gateway->>OrderService: Payment webhook
    OrderService->>ProductService: Update stock
    OrderService->>Kafka: Order created event
    Kafka->>KafkaService: Process notification
```

### Example 2: Product Moderation

```mermaid
sequenceDiagram
    participant Seller
    participant Gateway
    participant ProductService
    participant Kafka
    participant AdminService

    Seller->>Gateway: POST /product/api/create-product
    Gateway->>ProductService: Forward request
    ProductService->>ProductService: Auto moderation
    ProductService-->>Gateway: Product created (pending)
    Gateway-->>Seller: Success
    
    ProductService->>Kafka: Product pending event
    Kafka->>KafkaService: Process event
    KafkaService->>AdminService: Create notification
    
    Admin->>Gateway: GET /admin/api/get-pending-products
    Gateway->>AdminService: Forward request
    AdminService->>ProductService: Get products (internal)
    ProductService-->>AdminService: Products list
    AdminService-->>Gateway: Response
    Gateway-->>Admin: Products list
```

## Best Practices

1. **Use API Gateway for external requests**: All client requests go through the gateway
2. **Use service clients for internal calls**: Type-safe internal communication
3. **Use Kafka for events**: Decouple services for async operations
4. **Validate in service layer**: Don't trust data from other services
5. **Handle failures gracefully**: Use circuit breakers and retries
6. **Log all interactions**: Track service-to-service calls for debugging

## Error Handling

### Synchronous Calls
- Return appropriate HTTP status codes
- Include error details in response
- Log errors with context

### Asynchronous Events
- Implement idempotency
- Handle event failures gracefully
- Use dead letter queues for failed events

## Performance Considerations

1. **Caching**: Cache frequently accessed data (Redis)
2. **Connection Pooling**: Reuse database connections
3. **Async Operations**: Use async/await for I/O operations
4. **Batch Operations**: Group multiple operations when possible
5. **Circuit Breakers**: Prevent cascading failures

