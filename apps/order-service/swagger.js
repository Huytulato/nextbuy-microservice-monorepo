const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Order Service API',
    description: 'API documentation for Order Service - Order management and processing',
    version: '1.0.0',
  },
  host: 'localhost:6004',
  schemes: ['http'],
  tags: [
    {
      name: 'Order',
      description: 'Order management endpoints',
    },
  ],
  definitions: {
    Order: {
      id: 'order_id',
      userId: 'user_id',
      products: [
        {
          productId: 'product_id',
          quantity: 1,
          price: 99.99,
        },
      ],
      totalAmount: 99.99,
      status: 'pending',
      shippingAddress: 'Shipping Address',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/routes/order.route.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
