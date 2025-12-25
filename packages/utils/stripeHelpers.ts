import Stripe from "stripe";

/**
 * Kiểm tra xem Stripe account đã hoàn tất onboarding chưa
 * Account được coi là "fully onboarded" khi:
 * - charges_enabled === true (có thể nhận thanh toán)
 * - details_submitted === true (đã nộp đủ thông tin)
 * - requirements.currently_due.length === 0 (không còn requirements chưa hoàn tất)
 * 
 * @param stripeAccountId - Stripe Connect account ID
 * @param stripeInstance - Stripe instance (để tránh tạo nhiều instance)
 * @returns Promise<boolean> - true nếu account đã hoàn tất onboarding, false nếu chưa
 */
export const isStripeAccountFullyOnboarded = async (
  stripeAccountId: string,
  stripeInstance?: Stripe
): Promise<boolean> => {
  try {
    if (!stripeAccountId) {
      return false;
    }

    // Sử dụng instance được truyền vào hoặc tạo mới
    const stripe = stripeInstance || new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover' as any,
    });

    // Lấy thông tin account từ Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Kiểm tra các điều kiện cần thiết
    const chargesEnabled = account.charges_enabled === true;
    const detailsSubmitted = account.details_submitted === true;
    
    // Kiểm tra requirements - account phải không còn requirements chưa hoàn tất
    const requirements = account.requirements;
    const hasNoPendingRequirements = 
      !requirements?.currently_due || 
      (Array.isArray(requirements.currently_due) && requirements.currently_due.length === 0);

    // Account được coi là fully onboarded khi thỏa mãn tất cả điều kiện
    return chargesEnabled && detailsSubmitted && hasNoPendingRequirements;
  } catch (error) {
    // Nếu có lỗi khi gọi Stripe API, log và trả về false
    console.error('Error checking Stripe account status:', error);
    return false;
  }
};

