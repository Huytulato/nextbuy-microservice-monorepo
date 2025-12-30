# Service Structure Standardization Guide

## Standard Folder Structure

All services should follow this structure:

```
apps/{service-name}/src/
├── controllers/        # HTTP request handlers (plural)
├── services/           # Business logic layer
├── repositories/       # Data access layer
├── dto/               # Data Transfer Objects
├── types/             # TypeScript type definitions
├── routes/            # Express route definitions
├── utils/             # Service-specific utilities
├── middleware/        # Service-specific middleware (if any)
└── main.ts            # Application entry point
```

## Naming Conventions

1. **Folders**: Use plural for collections (controllers, services, repositories, dto)
2. **Files**: Use kebab-case for files (product.controller.ts, auth.service.ts)
3. **Classes**: Use PascalCase (ProductController, AuthService)
4. **Functions**: Use camelCase (getProduct, createUser)

## Layer Responsibilities

### Controllers
- Handle HTTP requests/responses
- Validate request data (using DTOs)
- Call service methods
- Return formatted responses
- Should be thin - no business logic

### Services
- Contain business logic
- Orchestrate multiple repository calls
- Handle business rules and validations
- Call external services if needed
- Return domain objects

### Repositories
- Data access only
- CRUD operations
- Query building
- No business logic
- Return database entities

### DTOs
- Request validation
- Response shaping
- Type safety
- API contracts

## Migration Checklist

For each service:
- [ ] Create `controllers/` folder (plural)
- [ ] Create `services/` folder
- [ ] Create `repositories/` folder
- [ ] Create `dto/` folder
- [ ] Move existing controller files to `controllers/`
- [ ] Extract business logic to services
- [ ] Create repository layer
- [ ] Create DTOs for all endpoints
- [ ] Update imports in routes
- [ ] Update imports in main.ts

## Example: Product Service (Completed)

✅ Controllers: `apps/product-service/src/controllers/product.controller.ts`
✅ Services: `apps/product-service/src/services/product.service.ts`
✅ Repositories: `apps/product-service/src/repositories/product.repository.ts`
✅ DTOs: `apps/product-service/src/dto/product.dto.ts`

## Next Services to Migrate

1. **auth-service** - High priority (core functionality)
2. **order-service** - High priority (business critical)
3. **seller-service** - Medium priority
4. **admin-service** - Medium priority

