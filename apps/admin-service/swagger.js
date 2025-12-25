const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Admin Service API',
    description: 'API documentation for Admin Service - Product moderation, user management, and analytics',
    version: '1.0.0',
  },
  host: 'localhost:6005',
  schemes: ['http'],
  tags: [
    {
      name: 'Admin',
      description: 'Admin operations endpoints',
    },
    {
      name: 'Moderation',
      description: 'Product moderation endpoints',
    },
    {
      name: 'Analytics',
      description: 'Analytics and reporting endpoints',
    },
  ],
  definitions: {
    ModerationConfig: {
      bannedKeywords: ['keyword1', 'keyword2'],
      sensitiveCategories: ['category1', 'category2'],
      autoApproveThreshold: 0.8,
    },
    BulkApproveRequest: {
      productIds: ['product_id_1', 'product_id_2'],
    },
    BulkRejectRequest: {
      productIds: ['product_id_1', 'product_id_2'],
      rejectionReason: 'Reason for bulk rejection',
    },
    ModerationAnalytics: {
      totalProducts: 100,
      pendingProducts: 10,
      approvedProducts: 70,
      rejectedProducts: 20,
      averageApprovalTime: '2h 30m',
      autoApprovedCount: 50,
      manuallyApprovedCount: 20,
      topRejectionReasons: [
        { reason: 'Inappropriate content', count: 10 },
        { reason: 'Incomplete information', count: 5 },
      ],
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./src/routes/admin.route.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
