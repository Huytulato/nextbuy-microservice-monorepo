import { BANNED_KEYWORDS, SENSITIVE_CATEGORIES } from '../config/moderation.config';

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

/**
 * Check if text contains banned keywords (case-insensitive)
 */
const containsBannedKeywords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BANNED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
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
export const checkProductModeration = (productData: ProductData): ModerationResult => {
  const reasons: string[] = [];
  let hasBannedKeywords = false;

  // Check title
  if (containsBannedKeywords(productData.title)) {
    hasBannedKeywords = true;
    reasons.push('Title contains prohibited keywords');
  }

  // Check short description
  if (containsBannedKeywords(productData.short_description)) {
    hasBannedKeywords = true;
    reasons.push('Short description contains prohibited keywords');
  }

  // Check detailed description
  if (productData.detailed_description && containsBannedKeywords(productData.detailed_description)) {
    hasBannedKeywords = true;
    reasons.push('Detailed description contains prohibited keywords');
  }

  // Check tags
  if (productData.tags && productData.tags.length > 0) {
    const bannedInTags = productData.tags.some(tag => containsBannedKeywords(tag));
    if (bannedInTags) {
      hasBannedKeywords = true;
      reasons.push('Tags contain prohibited keywords');
    }
  }

  // Check if category is sensitive
  const isSensitiveCategory = SENSITIVE_CATEGORIES.some(
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
  // - If score >= 90: auto approve
  // - Otherwise: pending (needs manual review)

  const shouldReject = hasBannedKeywords;
  const shouldApprove = !hasBannedKeywords && !isSensitiveCategory && moderationScore >= 90;

  return {
    shouldApprove,
    shouldReject,
    moderationScore,
    reasons,
  };
};

