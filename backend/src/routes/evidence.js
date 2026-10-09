import express from 'express';
import { verifyEvidence } from '../controllers/evidenceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/:id/verify', verifyEvidence);

export default router;
