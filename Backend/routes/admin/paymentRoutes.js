// routes/paymentRoutes.js
import express from 'express';
import { exportPayments, getAllPayments, getContests, getPaymentAnalytics, getPaymentStatistics, getSinglePayment, handleWebhook, updatePaymentStatus } from '../../controller/admin/paymentController.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// 1. Get All Payments
router.post('/', getAllPayments );

// 4. Export Payments
router.post('/export', exportPayments );

// 5. Get Payment Statistics
router.post('/stats',  getPaymentStatistics );

// 6. Get Contests
router.get('/contests', getContests );


// 7. Get Payment Analytics
router.get('/analytics', getPaymentAnalytics );

// 8. Webhook Notifications (No auth required)
router.post('/webhooks/payments', 
    express.raw({ type: 'application/json' }), // Raw body for signature verification
    handleWebhook
);

// 2. Get Single Payment
router.get('/:paymentId', getSinglePayment );

// 3. Update Payment Status (Admin only)
router.patch('/:paymentId/status',  adminMiddleware, updatePaymentStatus );

export default router;