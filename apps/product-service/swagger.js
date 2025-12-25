const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Product Service API',
    description: 'API documentation for Product Service - Product management, moderation, and draft functionality',
    version: '1.0.0',
  },
  host: 'localhost:6002',
  schemes: ['http'],
  tags: [
    {
      name: 'Product',
      description: 'Product management endpoints',
    },
    {
      name: 'Draft',
      description: 'Draft product endpoints',
    },
    {
      name: 'History',
      description: 'Product history endpoints',
    },
  ],
  definitions: {
    Product: {
      id: 'product_id',
      sellerId: 'seller_id',
      name: 'Product Name',
      description: 'Product Description',
      price: 99.99,
      category: 'Electronics',
      stock: 100,
      images: ['image1.jpg', 'image2.jpg'],
      status: 'pending',
      moderationStatus: 'pending',
      isDraft: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    DraftProduct: {
      sellerId: 'seller_id',
      name: 'Product Name',
      description: 'Product Description',
      price: 99.99,
      category: 'Electronics',
      stock: 100,
      images: ['image1.jpg', 'image2.jpg'],
      isDraft: true,
    },
    SubmitDraftRequest: {
      productId: 'product_id',
    },
    ProductHistory: {
      productId: 'product_id',
      history: [
        {
          action: 'created',
          timestamp: '2024-01-01T00:00:00.000Z',
          moderatorId: 'admin_id',
          reason: 'Initial creation',
          changes: {},
        },
      ],
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/routes/product.routes.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
