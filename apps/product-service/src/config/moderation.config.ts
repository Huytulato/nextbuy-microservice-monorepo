// Banned keywords that will trigger automatic rejection
export const BANNED_KEYWORDS: string[] = [
  // Weapons and explosives
  'weapon', 'gun', 'rifle', 'pistol', 'ammunition', 'explosive', 'bomb', 'knife', 'sword',
  // Drugs and illegal substances
  'drug', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'opium', 'methamphetamine',
  // Counterfeit items
  'fake', 'counterfeit', 'replica', 'knockoff', 'imitation',
  // Adult content
  'porn', 'pornography', 'adult', 'xxx', 'nsfw',
  // Wildlife
  'ivory', 'rhino horn', 'tiger', 'elephant', 'endangered species',
  // Other prohibited items
  'human organ', 'body part', 'illegal',
];

// Sensitive categories that require manual review
export const SENSITIVE_CATEGORIES: string[] = [
  'cosmetics',
  'health supplements',
  'pharmaceuticals',
  'food',
  'beverages',
  'luxury goods',
  'electronics',
  'jewelry',
];

// Brands that require verification (optional, for future use)
export const BRAND_VERIFICATION_REQUIRED: string[] = [
  'apple',
  'samsung',
  'nike',
  'adidas',
  'gucci',
  'louis vuitton',
  'chanel',
  'dior',
];

