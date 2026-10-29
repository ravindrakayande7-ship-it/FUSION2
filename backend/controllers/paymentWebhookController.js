import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PaymentAttempt } from '../models/PaymentAttempt.js';
import { fallbackStore } from '../services/storageFallback.js';
import { verifyRazorpayWebhookSignature } from '../services/razorpayService.js';
import { verifyCapturedPaymentFromWebhook } from '../services/paymentAttemptService.js';
import { createOrder } from './orderController.js';

export const razorpayWebhookHandler = async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!verifyRazorpayWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid Razorpay webhook signature.' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid webhook JSON payload.' });
  }

  if (event.event === 'payment.failed') {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id) {
      if (mongoose.connection.readyState === 1) {
        await PaymentAttempt.updateOne(
          { razorpayOrderId: payment.order_id, status: 'created' },
          { $set: { status: 'failed' } }
        );
      } else {
        const attempt = fallbackStore.paymentAttempts.find(
          (entry) => entry.razorpayOrderId === payment.order_id && entry.status === 'created'
        );
        if (attempt) attempt.status = 'failed';
      }
    }
    return res.status(200).json({ success: true, received: true });
  }

  if (event.event !== 'payment.captured') {
    // Acknowledge events not used to create orders.
    return res.status(200).json({ success: true, received: true });
  }

  try {
    const payment = event.payload?.payment?.entity;
    const { attempt, alreadyConsumed } = await verifyCapturedPaymentFromWebhook(payment);
    if (alreadyConsumed) return res.status(200).json({ success: true, received: true, duplicate: true });

    let user;
    if (mongoose.connection.readyState === 1) {
      const dbUser = await User.findById(attempt.staffId).select('-password').lean();
      if (!dbUser || dbUser.status !== 'Active') throw new Error('The staff account linked to this payment is unavailable.');
      user = { id: dbUser._id.toString(), name: dbUser.name, role: dbUser.role };
    } else {
      const fallbackUser = fallbackStore.users.find((entry) => entry.id === attempt.staffId);
      if (!fallbackUser) throw new Error('The staff account linked to this payment is unavailable.');
      user = { id: fallbackUser.id, name: fallbackUser.name, role: fallbackUser.role };
    }

    const orderReq = {
      user,
      body: {
        ...attempt.checkoutData,
        razorpayOrderId: attempt.razorpayOrderId,
        razorpayPaymentId: payment.id,
      },
    };
    let orderStatus = 500;
    let orderBody;
    await createOrder(orderReq, {
      status(code) { orderStatus = code; return this; },
      json(body) { orderBody = body; return this; },
    }, (error) => { throw error; });

    if (orderStatus < 200 || orderStatus >= 300) {
      throw new Error(orderBody?.message || 'The captured payment could not be finalized as an order.');
    }
    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('[Razorpay Webhook] Finalization failed:', error.message);
    return res.status(500).json({ success: false, message: 'Payment event received but order finalization needs retry.' });
  }
};
