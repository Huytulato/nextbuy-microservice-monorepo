/**
 * Data Migration Script: Migrate Existing Products to Variation System
 * 
 * This script:
 * 1. Finds all existing products
 * 2. Creates default variations for simple products (no colors/sizes)
 * 3. Creates variation groups and SKUs for products with colors/sizes
 * 4. Preserves existing product data
 * 5. Marks products as hasVariations = true
 * 
 * Run: npx tsx scripts/migrate-products-to-variations.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  generateVariations,
  generateDefaultVariation,
  VariationGroup,
} from '../packages/utils/variation-generator';

const prisma = new PrismaClient();

interface MigrationStats {
  totalProducts: number;
  simpleProducts: number;
  productsWithVariations: number;
  variationsCreated: number;
  variationGroupsCreated: number;
  errors: Array<{ productId: string; error: string }>;
}

async function migrateProduct(product: any, stats: MigrationStats) {
  try {
    console.log(`\nMigrating product: ${product.title} (${product.id})`);

    const hasColors = product.colors && product.colors.length > 0;
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasVariationGroups = hasColors || hasSizes;

    if (!hasVariationGroups) {
      // Simple product - create single default variation
      console.log(`  → Simple product, creating default variation`);
      
      const defaultVariation = generateDefaultVariation(
        product.slug,
        product.sale_price,
        product.stock
      );

      await prisma.product_variations.create({
        data: {
          productId: product.id,
          sku: defaultVariation.sku,
          attributes: defaultVariation.attributes,
          price: defaultVariation.price,
          stock: defaultVariation.stock,
          isActive: true,
          isDeleted: false,
        },
      });

      await prisma.products.update({
        where: { id: product.id },
        data: { hasVariations: true },
      });

      stats.simpleProducts++;
      stats.variationsCreated++;
      console.log(`  ✓ Created default variation: ${defaultVariation.sku}`);
      
    } else {
      // Product with variations
      console.log(`  → Product with variations`);
      
      const variationGroups: VariationGroup[] = [];

      // Create Color variation group
      if (hasColors) {
        console.log(`  → Creating Color group with ${product.colors.length} options`);
        
        const colorGroup = await prisma.variation_groups.create({
          data: {
            productId: product.id,
            name: 'Color',
            options: product.colors,
            position: 0,
          },
        });

        variationGroups.push({
          name: 'Color',
          options: product.colors,
          position: 0,
        });

        stats.variationGroupsCreated++;
      }

      // Create Size variation group
      if (hasSizes) {
        console.log(`  → Creating Size group with ${product.sizes.length} options`);
        
        const sizeGroup = await prisma.variation_groups.create({
          data: {
            productId: product.id,
            name: 'Size',
            options: product.sizes,
            position: 1,
          },
        });

        variationGroups.push({
          name: 'Size',
          options: product.sizes,
          position: 1,
        });

        stats.variationGroupsCreated++;
      }

      // Generate all variation combinations
      const variations = generateVariations({
        productSlug: product.slug,
        variationGroups,
        basePrice: product.sale_price,
        baseStock: Math.floor(product.stock / (product.colors?.length || 1) / (product.sizes?.length || 1)), // Distribute stock evenly
      });

      console.log(`  → Generated ${variations.length} variation combinations`);

      // Create all variations in database
      for (const variation of variations) {
        await prisma.product_variations.create({
          data: {
            productId: product.id,
            sku: variation.sku,
            attributes: variation.attributes,
            price: variation.price,
            stock: variation.stock,
            isActive: true,
            isDeleted: false,
          },
        });

        console.log(`    ✓ Created variation: ${variation.sku}`);
      }

      await prisma.products.update({
        where: { id: product.id },
        data: { hasVariations: true },
      });

      stats.productsWithVariations++;
      stats.variationsCreated += variations.length;
      console.log(`  ✓ Successfully migrated product with ${variations.length} variations`);
    }
    
  } catch (error: any) {
    console.error(`  ✗ Error migrating product ${product.id}:`, error.message);
    stats.errors.push({
      productId: product.id,
      error: error.message,
    });
  }
}

async function migrateAllProducts() {
  console.log('========================================');
  console.log('Starting Product Migration to Variation System');
  console.log('========================================\n');

  const stats: MigrationStats = {
    totalProducts: 0,
    simpleProducts: 0,
    productsWithVariations: 0,
    variationsCreated: 0,
    variationGroupsCreated: 0,
    errors: [],
  };

  try {
    // Get all products that haven't been migrated yet
    const products = await prisma.products.findMany({
      where: {
        hasVariations: false,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        colors: true,
        sizes: true,
        stock: true,
        sale_price: true,
        regular_price: true,
      },
    });

    stats.totalProducts = products.length;

    if (products.length === 0) {
      console.log('✓ No products found to migrate. All products already have variations.');
      return stats;
    }

    console.log(`Found ${products.length} products to migrate\n`);

    // Migrate products one by one
    for (const product of products) {
      await migrateProduct(product, stats);
    }

    // Print summary
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`Total products processed: ${stats.totalProducts}`);
    console.log(`Simple products: ${stats.simpleProducts}`);
    console.log(`Products with variations: ${stats.productsWithVariations}`);
    console.log(`Variation groups created: ${stats.variationGroupsCreated}`);
    console.log(`Total variations created: ${stats.variationsCreated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(err => {
        console.log(`  - Product ${err.productId}: ${err.error}`);
      });
    } else {
      console.log('\n✓ All products migrated successfully!');
    }

  } catch (error: any) {
    console.error('\n✗ Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

// Run migration if executed directly
if (require.main === module) {
  migrateAllProducts()
    .then(stats => {
      process.exit(stats.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateAllProducts };
