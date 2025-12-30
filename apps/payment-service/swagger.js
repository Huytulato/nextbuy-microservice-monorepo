const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'NextBuy Payment Service API',
    description: 'Payment processing service for NextBuy e-commerce platform',
    version: '1.0.0',
  },
  host: 'localhost:6007',
  basePath: '/api',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Payments',
      description: 'Payment processing endpoints',
    },
    {
      name: 'Refunds',
      description: 'Refund management endpoints',
    },
    {
      name: 'Webhooks',
      description: 'Payment gateway webhook endpoints',
    },
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'access_token',
      in: 'cookie',
    },
  },
  definitions: {
    CreatePaymentIntent: {
      amount: 100.00,
      currency: 'usd',
      sessionId: 'session-uuid',
      sellerId: 'seller-object-id',
    },
    CreatePaymentSession: {
      cart: [
        {
          id: 'product-id',
          quantity: 1,
          sale_price: 99.99,
          shopId: 'shop-id',
        },
      ],
      selectedAddressId: 'address-id',
    },
    RefundRequest: {
      paymentId: 'payment-object-id',
      amount: 50.00,
      reason: 'Customer request',
    },
    PaymentResponse: {
      id: 'payment-object-id',
      orderId: 'order-object-id',
      amount: 100.00,
      status: 'completed',
      method: 'credit_card',
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/routes/payment.route.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
