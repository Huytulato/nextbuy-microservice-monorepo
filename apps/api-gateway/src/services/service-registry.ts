/**
 * Service Registry
 * Manages service endpoints and health status
 */

export interface ServiceConfig {
  name: string;
  baseUrl: string;
  healthCheckPath?: string;
  timeout?: number;
  retries?: number;
}

export class ServiceRegistry {
  private services: Map<string, ServiceConfig> = new Map();
  private healthStatus: Map<string, { isHealthy: boolean; lastChecked: Date }> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    // Register all services
    this.registerService({
      name: 'auth-service',
      baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:6001',
      healthCheckPath: '/health/ready',
      timeout: 5000,
      retries: 3,
    });

    this.registerService({
      name: 'product-service',
      baseUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:6002',
      healthCheckPath: '/health/ready',
      timeout: 5000,
      retries: 3,
    });

    this.registerService({
      name: 'seller-service',
      baseUrl: process.env.SELLER_SERVICE_URL || 'http://localhost:6003',
      healthCheckPath: '/health/ready',
      timeout: 5000,
      retries: 3,
    });

    this.registerService({
      name: 'order-service',
      baseUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:6004',
      healthCheckPath: '/health/ready',
      timeout: 5000,
      retries: 3,
    });

    this.registerService({
      name: 'admin-service',
      baseUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:6005',
      healthCheckPath: '/health/ready',
      timeout: 5000,
      retries: 3,
    });

    this.registerService({
      name: 'payment-service',
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:6007',
      healthCheckPath: '/health/ready',
      timeout: 10000,
      retries: 3,
    });
  }

  registerService(config: ServiceConfig) {
    this.services.set(config.name, config);
    this.healthStatus.set(config.name, {
      isHealthy: true, // Assume healthy initially
      lastChecked: new Date(),
    });
  }

  getService(name: string): ServiceConfig | undefined {
    return this.services.get(name);
  }

  isServiceHealthy(name: string): boolean {
    const status = this.healthStatus.get(name);
    return status?.isHealthy ?? false;
  }

  async checkServiceHealth(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      return false;
    }

    try {
      const axios = (await import('axios')).default;
      const healthUrl = `${service.baseUrl}${service.healthCheckPath || '/health'}`;
      
      const response = await axios.get(healthUrl, {
        timeout: service.timeout || 5000,
      });

      const isHealthy = response.status === 200;
      this.healthStatus.set(name, {
        isHealthy,
        lastChecked: new Date(),
      });

      return isHealthy;
    } catch (error) {
      this.healthStatus.set(name, {
        isHealthy: false,
        lastChecked: new Date(),
      });
      return false;
    }
  }

  async checkAllServicesHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name] of this.services) {
      results[name] = await this.checkServiceHealth(name);
    }

    return results;
  }

  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  getServiceHealthStatus(): Record<string, { isHealthy: boolean; lastChecked: Date }> {
    const status: Record<string, { isHealthy: boolean; lastChecked: Date }> = {};
    
    for (const [name, health] of this.healthStatus) {
      status[name] = health;
    }

    return status;
  }
}

export const serviceRegistry = new ServiceRegistry();

