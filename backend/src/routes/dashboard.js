import express from 'express';
import { getCitizenDashboard, getAuthorityDashboard, getAdminDashboard } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/citizen', authorize('CITIZEN'), getCitizenDashboard);
router.get('/authority', authorize('AUTHORITY', 'INVESTIGATOR', 'VERIFIER'), getAuthorityDashboard);
router.get('/admin', authorize('ADMIN'), getAdminDashboard);

export default router;
