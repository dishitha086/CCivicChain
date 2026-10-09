import express from 'express';
import { listUsers, listOfficers, toggleUserStatus, updateUserRole } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), listUsers);
router.get('/officers', authorize('ADMIN', 'AUTHORITY'), listOfficers);
router.put('/:id/toggle-status', authorize('ADMIN'), toggleUserStatus);
router.put('/:id/role', authorize('ADMIN'), updateUserRole);

export default router;
