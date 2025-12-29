/**
 * Variation Generator Utility
 * Generates SKUs and variation combinations for products
 */

export interface VariationGroup {
  name: string;
  options: string[];
  position?: number;
}

export interface VariationCombination {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
}

export interface GenerateVariationsParams {
  productSlug: string;
  variationGroups: VariationGroup[];
  basePrice: number;
  baseStock: number;
  priceModifiers?: Record<string, number>; // Optional: {"Red-M": 5, "Blue-L": 10}
  stockOverrides?: Record<string, number>; // Optional: {"Red-M": 20, "Blue-L": 5}
}

/**
 * Generate Cartesian product of variation groups
 * Example: [["Red", "Blue"], ["M", "L"]] -> [["Red", "M"], ["Red", "L"], ["Blue", "M"], ["Blue", "L"]]
 */
function cartesianProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  return first.flatMap(item =>
    restProduct.map(combination => [item, ...combination])
  );
}

/**
 * Generate unique SKU for a variation combination
 * Format: SLUG-ATTR1-ATTR2-... (e.g., "product-red-m")
 */
function generateSKU(productSlug: string, attributes: Record<string, string>): string {
  const attributeValues = Object.values(attributes)
    .map(val => val.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    .join('-');
  
  return `${productSlug}-${attributeValues}`.toUpperCase();
}

/**
 * Create attribute key for price/stock lookups
 * Format: "Attr1Value-Attr2Value" (e.g., "Red-M")
 */
function createAttributeKey(attributes: Record<string, string>): string {
  return Object.values(attributes).join('-');
}

/**
 * Generate all variation combinations with SKUs
 */
export function generateVariations(params: GenerateVariationsParams): VariationCombination[] {
  const {
    productSlug,
    variationGroups,
    basePrice,
    baseStock,
    priceModifiers = {},
    stockOverrides = {},
  } = params;

  // Sort variation groups by position
  const sortedGroups = [...variationGroups].sort((a, b) => 
    (a.position || 0) - (b.position || 0)
  );

  // Extract option arrays for Cartesian product
  const optionArrays = sortedGroups.map(group => group.options);
  const groupNames = sortedGroups.map(group => group.name);

  // Generate all combinations
  const combinations = cartesianProduct(optionArrays);

  // Map combinations to variation objects
  return combinations.map(combination => {
    // Build attributes object: {Color: "Red", Size: "M"}
    const attributes: Record<string, string> = {};
    groupNames.forEach((name, index) => {
      attributes[name] = combination[index];
    });

    // Generate SKU
    const sku = generateSKU(productSlug, attributes);

    // Calculate price (base + modifier)
    const attributeKey = createAttributeKey(attributes);
    const priceModifier = priceModifiers[attributeKey] || 0;
    const price = basePrice + priceModifier;

    // Get stock (override or base)
    const stock = stockOverrides[attributeKey] ?? baseStock;

    return {
      sku,
      attributes,
      price,
      stock,
    };
  });
}

/**
 * Generate a single default variation for simple products (no variation groups)
 */
export function generateDefaultVariation(
  productSlug: string,
  price: number,
  stock: number
): VariationCombination {
  return {
    sku: `${productSlug}-default`.toUpperCase(),
    attributes: { default: 'default' },
    price,
    stock,
  };
}

/**
 * Validate variation groups
 */
export function validateVariationGroups(groups: VariationGroup[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!groups || groups.length === 0) {
    return { valid: true, errors: [] }; // Simple product
  }

  groups.forEach((group, index) => {
    if (!group.name || group.name.trim() === '') {
      errors.push(`Variation group ${index + 1}: Name is required`);
    }

    if (!group.options || group.options.length === 0) {
      errors.push(`Variation group "${group.name}": At least one option is required`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(group.options);
    if (uniqueOptions.size !== group.options.length) {
      errors.push(`Variation group "${group.name}": Contains duplicate options`);
    }

    // Check for empty options
    if (group.options.some(opt => !opt || opt.trim() === '')) {
      errors.push(`Variation group "${group.name}": Contains empty options`);
    }
  });

  // Check for duplicate group names
  const groupNames = groups.map(g => g.name.toLowerCase());
  const uniqueNames = new Set(groupNames);
  if (uniqueNames.size !== groupNames.length) {
    errors.push('Duplicate variation group names found');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total number of variations that will be generated
 */
export function calculateVariationCount(groups: VariationGroup[]): number {
  if (!groups || groups.length === 0) return 1; // Default variation

  return groups.reduce((total, group) => {
    return total * (group.options?.length || 0);
  }, 1);
}

/**
 * Format attributes for display (e.g., "Color: Red, Size: M")
 */
export function formatAttributes(attributes: Record<string, string>): string {
  if (attributes.default === 'default') return 'Standard';
  
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

/**
 * Check if a variation should be soft-deleted (has orders)
 */
export function canHardDeleteVariation(hasOrders: boolean): boolean {
  return !hasOrders;
}
