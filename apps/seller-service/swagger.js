const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Seller Service API',
    description: 'API documentation for Seller Service - Seller management and operations',
    version: '1.0.0',
  },
  host: 'localhost:6003',
  schemes: ['http'],
  tags: [
    {
      name: 'Seller',
      description: 'Seller management endpoints',
    },
  ],
  definitions: {
    Seller: {
      id: 'seller_id',
      userId: 'user_id',
      businessName: 'Business Name',
      email: 'seller@example.com',
      phone: '+1234567890',
      address: 'Business Address',
      status: 'active',
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/routes/seller.route.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
