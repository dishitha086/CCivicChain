
import express from 'express';
import {
  verifyEvidence,
  reviewResolutionEvidence
} from '../controllers/evidenceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Verify whether the uploaded file has been altered.
router.get('/:id/verify', verifyEvidence);

// Investigator and Verifier review the same resolution evidence.
router.post('/:id/review', reviewResolutionEvidence);

export default router;
