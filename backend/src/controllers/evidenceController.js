
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database.js';

const UPLOAD_PATH = path.resolve(
  process.env.UPLOAD_PATH || path.join(process.cwd(), '..', 'uploads')
);

['evidence', 'avatars'].forEach(dir => {
  const p = path.join(UPLOAD_PATH, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_PATH, 'evidence'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} not allowed. Allowed: images, PDFs, videos, Word docs`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024
  }
});

function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function removeUploadedFile(file) {
  if (file?.path) {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {
      // Ignore cleanup errors.
    }
  }
}

/**
 * Upload original complaint evidence or resolution evidence.
 *
 * ORIGINAL:
 *   Preserves the existing citizen complaint evidence workflow.
 *
 * RESOLUTION:
 *   Only AUTHORITY and ADMIN can upload repair/resolution proof.
 *   Each upload creates a new evidence record with its own hash
 *   and independent review history.
 */
export async function uploadEvidence(req, res) {
  try {
    const db = getDb();

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const evidenceType = String(
      req.body.evidence_type || 'ORIGINAL'
    ).trim().toUpperCase();

    if (!['ORIGINAL', 'RESOLUTION'].includes(evidenceType)) {
      removeUploadedFile(req.file);

      return res.status(400).json({
        error: 'Invalid evidence_type. Use ORIGINAL or RESOLUTION.'
      });
    }

    const complaint = await db.get(
      'SELECT * FROM complaints WHERE id = ?',
      req.params.id
    );

    if (!complaint) {
      removeUploadedFile(req.file);

      return res.status(404).json({
        error: 'Complaint not found'
      });
    }

    const role = req.user.role;

    if (evidenceType === 'RESOLUTION') {
  if (!['AUTHORITY', 'ADMIN'].includes(role)) {
    removeUploadedFile(req.file);
    return res.status(403).json({
      error: 'Only Authority or Admin can upload resolution evidence.'
    });
  }

  // The repair photo must be uploaded while the complaint is VERIFIED.
  if (complaint.status !== 'VERIFIED') {
    removeUploadedFile(req.file);
    return res.status(409).json({
      error: 'Resolution evidence must be uploaded while the complaint is VERIFIED.',
      currentStatus: complaint.status
    });
  }
}

    const sha256Hash = await computeFileHash(req.file.path);
    const evidenceId = uuidv4();
    const now = new Date().toISOString();

    const isInvestigation =
      ['INVESTIGATOR', 'AUTHORITY', 'ADMIN'].includes(role) ? 1 : 0;

    await db.run(
      `INSERT INTO evidence (
        id,
        complaint_id,
        uploaded_by,
        filename,
        original_name,
        file_path,
        file_size,
        mime_type,
        sha256_hash,
        description,
        is_investigation_evidence,
        evidence_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evidenceId,
        complaint.id,
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        sha256Hash,
        req.body.description || null,
        isInvestigation,
        evidenceType,
        now
      ]
    );

    return res.status(201).json({
      message:
        evidenceType === 'RESOLUTION'
          ? 'Resolution evidence uploaded successfully. Investigator and Verifier reviews are pending.'
          : 'Evidence uploaded successfully',
      evidence: {
        id: evidenceId,
        complaint_id: complaint.id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        sha256_hash: sha256Hash,
        description: req.body.description || null,
        evidence_type: evidenceType,
        url: `/uploads/evidence/${req.file.filename}`,
        created_at: now
      },
      reviewStatus:
        evidenceType === 'RESOLUTION'
          ? {
              investigator: 'PENDING',
              verifier: 'PENDING',
              canProceedToResolution: false
            }
          : undefined,
      integrity: {
        sha256: sha256Hash,
        message:
          'SHA-256 hash recorded. Use /api/evidence/:id/verify to check integrity at any time.'
      }
    });
  } catch (err) {
    console.error('Upload evidence error:', err);

    removeUploadedFile(req.file);

    return res.status(500).json({
      error: 'Failed to upload evidence'
    });
  }
}

/**
 * Review one specific resolution evidence file.
 *
 * POST /api/evidence/:id/review
 *
 * Expected JSON:
 * {
 *   "decision": "APPROVED" or "REJECTED",
 *   "comments": "Review notes"
 * }
 *
 * A reviewer can submit only one decision per evidence file.
 * A replacement upload receives a new evidence ID and starts
 * with fresh reviews.
 */
export async function reviewResolutionEvidence(req, res) {
  try {
    const db = getDb();
    const role = req.user.role;

    if (!['INVESTIGATOR', 'VERIFIER'].includes(role)) {
      return res.status(403).json({
        error: 'Only the assigned review roles can review resolution evidence.'
      });
    }

    const decision = String(req.body.decision || '')
      .trim()
      .toUpperCase();

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        error: 'Invalid decision. Use APPROVED or REJECTED.'
      });
    }

    const evidence = await db.get(
      `SELECT e.*, c.status AS complaint_status
       FROM evidence e
       JOIN complaints c ON c.id = e.complaint_id
       WHERE e.id = ?`,
      req.params.id
    );

    if (!evidence) {
      return res.status(404).json({
        error: 'Evidence not found'
      });
    }

    if (evidence.evidence_type !== 'RESOLUTION') {
      return res.status(400).json({
        error: 'Only resolution evidence can be reviewed through this endpoint.'
      });
    }

    if (
      ['RESOLVED', 'RESOLUTION_VERIFIED', 'CLOSED'].includes(
        evidence.complaint_status
      )
    ) {
      return res.status(409).json({
        error: 'This complaint is already resolved or closed.'
      });
    }

    // Only the newest resolution upload can be reviewed.
    // Older files cannot be approved after replacement evidence exists.
    const latestEvidence = await db.get(
  `SELECT id
   FROM evidence
   WHERE complaint_id = ?
     AND evidence_type = 'RESOLUTION'
   ORDER BY created_at DESC, id DESC
   LIMIT 1`,
  [evidence.complaint_id]
);

    if (!latestEvidence || latestEvidence.id !== evidence.id) {
      return res.status(409).json({
        error: 'This evidence has been superseded. Review the latest upload instead.'
      });
    }

    const existingReview = await db.get(
      `SELECT id, decision
       FROM evidence_reviews
       WHERE evidence_id = ? AND reviewer_role = ?`,
      [evidence.id, role]
    );

    if (existingReview) {
      return res.status(409).json({
        error:
          'You have already reviewed this evidence. The decision cannot be changed for the same file.',
        existingDecision: existingReview.decision,
        message:
          'If the evidence was rejected, the Authority must upload replacement evidence.'
      });
    }

    const reviewId = uuidv4();
    const now = new Date().toISOString();
    const comments =
      typeof req.body.comments === 'string'
        ? req.body.comments.trim() || null
        : null;

    await db.run(
      `INSERT INTO evidence_reviews (
        id,
        evidence_id,
        reviewer_role,
        reviewer_id,
        decision,
        comments,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        evidence.id,
        role,
        req.user.id,
        decision,
        comments,
        now
      ]
    );

    const reviews = await db.all(
      `SELECT reviewer_role, decision, comments, created_at
       FROM evidence_reviews
       WHERE evidence_id = ?`,
      [evidence.id]
    );

    const investigatorReview = reviews.find(
      review => review.reviewer_role === 'INVESTIGATOR'
    );

    const verifierReview = reviews.find(
      review => review.reviewer_role === 'VERIFIER'
    );

    const rejected =
      investigatorReview?.decision === 'REJECTED' ||
      verifierReview?.decision === 'REJECTED';

    const bothApproved =
      investigatorReview?.decision === 'APPROVED' &&
      verifierReview?.decision === 'APPROVED';

    return res.status(201).json({
      message: rejected
        ? 'Evidence rejected. The complaint remains open and the Authority must upload replacement evidence.'
        : bothApproved
          ? 'Both reviewers approved this evidence. It may proceed to the complaint resolution workflow.'
          : 'Review recorded. The other reviewer must independently review this evidence.',
      review: {
        id: reviewId,
        evidence_id: evidence.id,
        reviewer_role: role,
        decision,
        comments,
        created_at: now
      },
      reviewStatus: {
        investigator: investigatorReview?.decision || 'PENDING',
        verifier: verifierReview?.decision || 'PENDING',
        rejected,
        bothApproved,
        canProceedToResolution: bothApproved && !rejected,
        requiresReplacementEvidence: rejected
      }
    });
  } catch (err) {
    // Handle a duplicate review if two requests race.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'Your role has already reviewed this evidence.'
      });
    }

    console.error('Review resolution evidence error:', err);

    return res.status(500).json({
      error: 'Failed to review resolution evidence'
    });
  }
}

/**
 * Verify file integrity independently of human review.
 *
 * GET /api/evidence/:id/verify
 */
export async function verifyEvidence(req, res) {
  try {
    const db = getDb();

    const evidence = await db.get(
      `SELECT e.*, c.citizen_id
       FROM evidence e
       JOIN complaints c ON e.complaint_id = c.id
       WHERE e.id = ?`,
      req.params.id
    );

    if (!evidence) {
      return res.status(404).json({
        error: 'Evidence not found'
      });
    }

    let currentHash = null;
    let fileExists = false;

    try {
      currentHash = await computeFileHash(evidence.file_path);
      fileExists = true;
    } catch (_) {
      // Missing or unreadable files fail integrity verification.
    }

    const isIntact =
      fileExists && currentHash === evidence.sha256_hash;

    return res.json({
      evidenceId: evidence.id,
      filename: evidence.original_name,
      evidenceType: evidence.evidence_type || 'ORIGINAL',
      storedHash: evidence.sha256_hash,
      currentHash,
      fileExists,
      isIntact,
      message: isIntact
        ? 'Evidence integrity verified - file has not been tampered with'
        : 'HASH MISMATCH - evidence may have been altered or file is missing'
    });
  } catch (err) {
    console.error('Verify evidence error:', err);

    return res.status(500).json({
      error: 'Failed to verify evidence'
    });
  }
}
