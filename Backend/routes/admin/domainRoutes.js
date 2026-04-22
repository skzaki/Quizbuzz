import express from 'express';
import { getAllDomains } from '../../controller/admin/domainController.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getAllDomains);

export default router;
