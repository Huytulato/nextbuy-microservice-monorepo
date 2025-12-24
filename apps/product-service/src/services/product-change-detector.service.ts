interface Product {
  title: string;
  short_description: string;
  detailed_description?: string;
  category: string;
  subCategory?: string;
  sale_price: number;
  regular_price: number;
  images?: Array<{ url: string }>;
  brand?: string;
}

interface ChangeDetectionResult {
  hasSignificantChanges: boolean;
  changedFields: string[];
}

/**
 * Detect significant changes in product that require re-review
 */
export const detectSignificantChanges = (
  oldProduct: Product,
  newProduct: Product
): ChangeDetectionResult => {
  const changedFields: string[] = [];

  // Check title change
  if (oldProduct.title !== newProduct.title) {
    changedFields.push('title');
  }

  // Check description changes (if changed significantly)
  if (oldProduct.short_description !== newProduct.short_description) {
    changedFields.push('short_description');
  }

  if (oldProduct.detailed_description !== newProduct.detailed_description) {
    changedFields.push('detailed_description');
  }

  // Check category change
  if (oldProduct.category !== newProduct.category) {
    changedFields.push('category');
  }

  if (oldProduct.subCategory !== newProduct.subCategory) {
    changedFields.push('subCategory');
  }

  // Check price changes (> 20% change)
  const priceChangePercent = Math.abs(
    ((newProduct.sale_price - oldProduct.sale_price) / oldProduct.sale_price) * 100
  );
  if (priceChangePercent > 20) {
    changedFields.push('price');
  }

  // Check brand change
  if (oldProduct.brand !== newProduct.brand) {
    changedFields.push('brand');
  }

  // Check image changes (if images were added/removed)
  const oldImageCount = oldProduct.images?.length || 0;
  const newImageCount = newProduct.images?.length || 0;
  if (oldImageCount !== newImageCount) {
    changedFields.push('images');
  }

  // Consider it significant if:
  // - Title changed
  // - Category changed
  // - Price changed > 20%
  // - Images changed
  // - Brand changed
  const significantFields = ['title', 'category', 'price', 'images', 'brand'];
  const hasSignificantChanges = changedFields.some(field => significantFields.includes(field));

  return {
    hasSignificantChanges,
    changedFields,
  };
};

