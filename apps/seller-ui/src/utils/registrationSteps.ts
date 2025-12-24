/**
 * Utility function to determine which registration step is incomplete
 * @param seller - The seller object from the API
 * @returns The step number (1-4) that needs to be completed, or null if all steps are complete
 * 
 * Steps:
 * 1 = Create Account (seller exists)
 * 2 = Submit Documents (seller.documents exists and has data)
 * 3 = Setup Shop (seller.shops exists)
 * 4 = Connect Bank/Stripe (seller.stripeId exists)
 */
export const getIncompleteStep = (seller: any): number | null => {
  // If seller doesn't exist, they need to create an account (step 1)
  if (!seller || !seller.id) {
    return 1;
  }
  
  // Step 2: Check if documents are submitted
  // documents is a Json field, so we need to check if it exists and has content
  if (!seller.documents || 
      (typeof seller.documents === 'object' && Object.keys(seller.documents).length === 0)) {
    return 2;
  }
  
  // Step 3: Check if shop is created
  // shops is a relation, so it can be null or an object
  if (!seller.shops) {
    return 3;
  }
  
  // Step 4: Check if Stripe account is connected
  if (!seller.stripeId) {
    return 4;
  }
  
  // All steps are complete
  return null;
};

