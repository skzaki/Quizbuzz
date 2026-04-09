import express from 'express';
import { getSettings, updateSettings } from '../../controller/admin/settingsController.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication + admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
