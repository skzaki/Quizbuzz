// routes/paymentRoutes.js
// F-03: Added adminMiddleware to all payment routes (except webhook which must stay public)
import express from 'express';
import {
  exportPayments,
  getAllPayments,
  getContests,
  getPaymentAnalytics,
  getPaymentStatistics,
  getSinglePayment,
  handleWebhook,
  updatePaymentStatus
} from '../../controller/admin/paymentController.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Webhook — must be unauthenticated (Razorpay calls this directly)
// Registered BEFORE router.use(adminMiddleware) to remain public
router.post('/webhooks/payments',
  express.raw({ type: 'application/json' }), // Raw body for HMAC signature verification
  handleWebhook
);

// Apply auth + admin middleware to ALL routes below this point (F-03)
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Get All Payments
router.post('/', getAllPayments);

// 2. Get Single Payment
router.get('/:paymentId', getSinglePayment);

// 3. Update Payment Status (admin only — already covered by router-level adminMiddleware)
router.patch('/:paymentId/status', updatePaymentStatus);

// 4. Export Payments
router.post('/export', exportPayments);

// 5. Get Payment Statistics
router.post('/stats', getPaymentStatistics);

// 6. Get Contests (for filter dropdowns)
router.get('/contests', getContests);

// 7. Get Payment Analytics
router.get('/analytics', getPaymentAnalytics);

export default router;