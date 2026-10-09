import express from 'express';
import { getExplorerData, verifyLedgerIntegrity } from '../controllers/blockchainController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/explorer', getExplorerData);
router.get('/verify-integrity', verifyLedgerIntegrity);

export default router;
