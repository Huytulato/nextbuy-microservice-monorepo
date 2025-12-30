// Re-export existing middleware
export { isAuthenticated, isSeller, isAdmin } from './isAuthenticated';
export { isSeller as authorizeSeller, isUser, isAdmin as authorizeAdmin } from './authorizeRoles';

// Export new middleware
export { getCorsConfig, defaultCorsConfig } from './cors.config';
export { configureExpressApp, addErrorHandling } from './express.config';
export { createHealthCheckRouter, simpleHealthCheck } from './health-check';
export type { HealthCheckResponse } from './health-check';

