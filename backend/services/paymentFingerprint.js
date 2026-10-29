import crypto from 'crypto';

export const createPaymentFingerprint = (body = {}) => {
  const items = (Array.isArray(body.items) ? body.items : []).map((item) => ({
    productId: String(item.productId || item.id || ''),
    quantity: Number(item.quantity),
    size: String(item.size || 'Standard'),
    customizations: (Array.isArray(item.customizations) ? item.customizations : [])
      .map((customization) => String(customization.name || '').trim().toLowerCase())
      .sort(),
    notes: String(item.notes || '').trim(),
  }));

  const canonical = JSON.stringify({
    items,
    customerName: String(body.customerName || '').trim(),
    customerPhone: String(body.customerPhone || '').trim(),
    orderType: String(body.orderType || 'Dine-in'),
    tableNumber: String(body.tableNumber || ''),
    paymentMethod: String(body.paymentMethod || 'UPI'),
    notes: String(body.notes || '').trim(),
    discountReason: String(body.discountReason || '').trim(),
    discount: body.discount == null ? null : Number(body.discount),
    discountPercent: body.discountPercent == null ? null : Number(body.discountPercent),
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
};
