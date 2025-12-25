import prisma from '@packages/libs/prisma';

interface ProductData {
  title: string;
  short_description: string;
  detailed_description?: string;
  tags?: string[];
  category: string;
  brand?: string;
}

interface ModerationResult {
  shouldApprove: boolean;
  shouldReject: boolean;
  moderationScore: number;
  reasons: string[];
}

// Cache for moderation config (refresh every 5 minutes)
let cachedConfig: {
  bannedKeywords: string[];
  sensitiveCategories: string[];
  autoApproveThreshold: number;
  lastFetch: number;
} | null = null;

const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get moderation config from database with caching
 */
const getModerationConfig = async () => {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - cachedConfig.lastFetch) < CONFIG_CACHE_DURATION) {
    return cachedConfig;
  }

  // Fetch from database
  const dbConfig = await prisma.moderation_config.findFirst({
    orderBy: { updatedAt: 'desc' }
  });

  // Create default config if none exists
  if (!dbConfig) {
    const defaultConfig = await prisma.moderation_config.create({
      data: {
        bannedKeywords: [
          'weapon', 'weapons', 'gun', 'guns', 'knife', 'knives',
          'drug', 'drugs', 'cocaine', 'heroin', 'marijuana',
          'counterfeit', 'fake', 'replica',
          'adult', 'porn', 'pornography', 'xxx',
          'wildlife', 'ivory', 'endangered',
          'illegal', 'stolen', 'hacked'
        ],
        sensitiveCategories: [
          'cosmetics', 'health supplements', 'pharmaceuticals',
          'food', 'luxury goods', 'electronics', 'jewelry'
        ],
        autoApproveThreshold: 90
      }
    });
    
    cachedConfig = {
      bannedKeywords: defaultConfig.bannedKeywords,
      sensitiveCategories: defaultConfig.sensitiveCategories,
      autoApproveThreshold: defaultConfig.autoApproveThreshold,
      lastFetch: now
    };
  } else {
    cachedConfig = {
      bannedKeywords: dbConfig.bannedKeywords,
      sensitiveCategories: dbConfig.sensitiveCategories,
      autoApproveThreshold: dbConfig.autoApproveThreshold,
      lastFetch: now
    };
  }

  return cachedConfig;
};

/**
 * Check if text contains banned keywords (case-insensitive)
 */
const containsBannedKeywords = (text: string, bannedKeywords: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return bannedKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

/**
 * Calculate moderation score based on various factors
 * Score range: 0-100 (higher = safer)
 */
const calculateModerationScore = (
  hasBannedKeywords: boolean,
  isSensitiveCategory: boolean,
  hasCompleteInfo: boolean,
  tagCount: number
): number => {
  let score = 100;

  // Heavy penalty for banned keywords
  if (hasBannedKeywords) {
    score -= 80;
  }

  // Moderate penalty for sensitive categories (requires review)
  if (isSensitiveCategory) {
    score -= 20;
  }

  // Small penalty for incomplete information
  if (!hasCompleteInfo) {
    score -= 10;
  }

  // Bonus for having tags (indicates more complete listing)
  if (tagCount > 0) {
    score = Math.min(100, score + 5);
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Main moderation check function
 */
export const checkProductModeration = async (productData: ProductData): Promise<ModerationResult> => {
  // Get moderation config from database (with caching)
  const config = await getModerationConfig();
  
  const reasons: string[] = [];
  let hasBannedKeywords = false;

  // Check title
  if (containsBannedKeywords(productData.title, config.bannedKeywords)) {
    hasBannedKeywords = true;
    reasons.push('Title contains prohibited keywords');
  }

  // Check short description
  if (containsBannedKeywords(productData.short_description, config.bannedKeywords)) {
    hasBannedKeywords = true;
    reasons.push('Short description contains prohibited keywords');
  }

  // Check detailed description
  if (productData.detailed_description && containsBannedKeywords(productData.detailed_description, config.bannedKeywords)) {
    hasBannedKeywords = true;
    reasons.push('Detailed description contains prohibited keywords');
  }

  // Check tags
  if (productData.tags && productData.tags.length > 0) {
    const bannedInTags = productData.tags.some(tag => containsBannedKeywords(tag, config.bannedKeywords));
    if (bannedInTags) {
      hasBannedKeywords = true;
      reasons.push('Tags contain prohibited keywords');
    }
  }

  // Check if category is sensitive
  const isSensitiveCategory = config.sensitiveCategories.some(
    cat => productData.category.toLowerCase().includes(cat.toLowerCase())
  );

  // Check if product has complete information
  const hasCompleteInfo = !!(
    productData.title &&
    productData.short_description &&
    productData.title.length > 5 &&
    productData.short_description.length > 10
  );

  // Calculate moderation score
  const moderationScore = calculateModerationScore(
    hasBannedKeywords,
    isSensitiveCategory,
    hasCompleteInfo,
    productData.tags?.length || 0
  );

  // Decision logic:
  // - If banned keywords found: reject
  // - If sensitive category: pending (needs manual review)
  // - If score >= threshold: auto approve
  // - Otherwise: pending (needs manual review)

  const shouldReject = hasBannedKeywords;
  const shouldApprove = !hasBannedKeywords && !isSensitiveCategory && moderationScore >= config.autoApproveThreshold;

  return {
    shouldApprove,
    shouldReject,
    moderationScore,
    reasons,
  };
};