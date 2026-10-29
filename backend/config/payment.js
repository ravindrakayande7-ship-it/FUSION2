export const validatePaymentConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const anyGatewaySetting = Boolean(keyId || keySecret || webhookSecret);

  if (anyGatewaySetting && (!keyId || !keySecret || !webhookSecret)) {
    throw new Error('Production Razorpay setup is incomplete. Configure key ID, key secret, and webhook secret together.');
  }
};

export default validatePaymentConfig;
