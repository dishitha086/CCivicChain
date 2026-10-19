
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
  const dirPath = path.join(UPLOAD_PATH, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
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
    cb(new Error(`File type ${file.mimetype} is not allowed.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:
      parseInt(process.env.MAX_FILE_SIZE, 10) ||
      10 * 1024 * 1024
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
    } catch {
      // Ignore cleanup errors.
    }
  }
}

/**
 * Get the latest resolution evidence and its independent reviews.
 *
 * Two DIFFERENT Verifier accounts must approve the same evidence.
 * Any Verifier rejection blocks resolution until replacement evidence
 * is uploaded.
 */
async function getResolutionReviewStatus(db, evidenceId) {
  const reviews = await db.all(
    `SELECT id, evidence_id, reviewer_role, reviewer_id,
            decision, comments, created_at
     FROM evidence_reviews
     WHERE evidence_id = ?
     ORDER BY created_at ASC`,
    [evidenceId]
  );

  const investigatorReviews = reviews.filter(
    r => r.reviewer_role === 'INVESTIGATOR'
  );

  const verifierReviews = reviews.filter(
    r => r.reviewer_role === 'VERIFIER'
  );

  const approvedVerifiers = new Set(
    verifierReviews
      .filter(r => r.decision === 'APPROVED')
      .map(r => r.reviewer_id)
  );

  const rejectedVerifiers = new Set(
    verifierReviews
      .filter(r => r.decision === 'REJECTED')
      .map(r => r.reviewer_id)
  );

  const rejected =
    rejectedVerifiers.size > 0;

  const approvedCount =
    approvedVerifiers.size;

  const bothApproved =
    approvedCount >= 2 && !rejected;

  return {
    reviews,
    investigatorReviews,
    verifierReviews,
    approvedVerifierCount: approvedCount,
    rejectedVerifierCount: rejectedVerifiers.size,
    rejected,
    bothApproved,
    canProceedToResolution: bothApproved
  };
}

/**
 * POST /api/complaints/:id/evidence
 *
 * Uploads each file as a separate database record.
 * Each file receives its own SHA-256 hash.
 */
export async function uploadEvidence(req, res) {
  let uploadedFile = req.file;
  let databaseInsertSucceeded = false;

  try {
    if (!uploadedFile) {
      return res.status(400).json({
        error:
          'No file uploaded. Use multipart/form-data and name the file field "file".'
      });
    }

    const db = getDb();

    const evidenceType = String(
      req.body.evidence_type || 'ORIGINAL'
    ).trim().toUpperCase();

    if (!['ORIGINAL', 'RESOLUTION'].includes(evidenceType)) {
      return res.status(400).json({
        error: 'Invalid evidence_type. Use ORIGINAL or RESOLUTION.'
      });
    }

    const complaint = await db.get(
      'SELECT * FROM complaints WHERE id = ?',
      [req.params.id]
    );

    if (!complaint) {
      return res.status(404).json({
        error: 'Complaint not found'
      });
    }

    const role = req.user.role;

    if (evidenceType === 'RESOLUTION') {
      if (!['AUTHORITY', 'ADMIN'].includes(role)) {
        return res.status(403).json({
          error:
            'Only Authority or Admin can upload resolution evidence.'
        });
      }

      // Preserve the existing lifecycle: action must be taken first.
      if (complaint.status !== 'ACTION_TAKEN') {
        return res.status(409).json({
          error:
            'Resolution evidence can only be uploaded when the complaint is ACTION_TAKEN.',
          currentStatus: complaint.status
        });
      }

      if (!uploadedFile.mimetype.startsWith('image/')) {
        return res.status(400).json({
          error: 'Resolution evidence must be an image.'
        });
      }
    }

    const evidenceId = uuidv4();
    const sha256Hash = await computeFileHash(uploadedFile.path);
    const now = new Date().toISOString();

    const isInvestigation = [
      'INVESTIGATOR',
      'AUTHORITY',
      'ADMIN'
    ].includes(role) ? 1 : 0;

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
        uploadedFile.filename,
        uploadedFile.originalname,
        uploadedFile.path,
        uploadedFile.size,
        uploadedFile.mimetype,
        sha256Hash,
        typeof req.body.description === 'string'
          ? req.body.description.trim() || null
          : null,
        isInvestigation,
        evidenceType,
        now
      ]
    );

    databaseInsertSucceeded = true;

    const evidence = {
      id: evidenceId,
      complaint_id: complaint.id,
      uploaded_by: req.user.id,
      filename: uploadedFile.filename,
      original_name: uploadedFile.originalname,
      file_size: uploadedFile.size,
      mime_type: uploadedFile.mimetype,
      sha256_hash: sha256Hash,
      description: req.body.description?.trim() || null,
      is_investigation_evidence: isInvestigation,
      evidence_type: evidenceType,
      url: `/uploads/evidence/${encodeURIComponent(uploadedFile.filename)}`,
      created_at: now
    };

    // The file must remain on disk after its database record is saved.
    uploadedFile = null;

    return res.status(201).json({
      message:
        evidenceType === 'RESOLUTION'
          ? 'Resolution evidence uploaded and hashed. Two distinct Verifier approvals are required.'
          : 'Evidence uploaded and hashed successfully.',
      evidence,
      reviewStatus:
        evidenceType === 'RESOLUTION'
          ? {
              investigator: 'PENDING',
              approvedVerifierCount: 0,
              requiredVerifierApprovals: 2,
              rejected: false,
              bothApproved: false,
              canProceedToResolution: false
            }
          : undefined,
      integrity: {
        sha256: sha256Hash,
        isIntact: true,
        message: 'SHA-256 hash recorded for this file.'
      }
    });
  } catch (err) {
    console.error('Upload evidence error:', err);

    if (uploadedFile && !databaseInsertSucceeded) {
      removeUploadedFile(uploadedFile);
    }

    return res.status(500).json({
      error: 'Failed to upload evidence',
      details:
        process.env.NODE_ENV === 'development'
          ? err.message
          : undefined
    });
  }
}

/**
 * POST /api/evidence/:id/review
 *
 * Body:
 * {
 *   "decision": "APPROVED",
 *   "comments": "Work has been completed"
 * }
 *
 * Each Investigator can review once.
 * Each Verifier account can review once.
 * Two distinct Verifier approvals are required for resolution.
 */
export async function reviewResolutionEvidence(req, res) {
  try {
    const db = getDb();
    const role = req.user.role;

    if (!['INVESTIGATOR', 'VERIFIER'].includes(role)) {
      return res.status(403).json({
        error:
          'Only Investigators and Verifiers can review resolution evidence.'
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
      [req.params.id]
    );

    if (!evidence) {
      return res.status(404).json({
        error: 'Evidence not found'
      });
    }

    if (evidence.evidence_type !== 'RESOLUTION') {
      return res.status(400).json({
        error:
          'Only resolution evidence can be reviewed through this endpoint.'
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

    const latestEvidence = await db.get(
      `SELECT id
       FROM evidence
       WHERE complaint_id = ?
         AND evidence_type = 'RESOLUTION'
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
      [evidence.complaint_id]
    );

    if (!latestEvidence || latestEvidence.id !== evidence.id) {
      return res.status(409).json({
        error:
          'This evidence has been superseded. Review the latest upload instead.'
      });
    }

    // Check this user's review, not the whole role.
    const existingReview = await db.get(
      `SELECT id, decision
       FROM evidence_reviews
       WHERE evidence_id = ?
         AND reviewer_id = ?`,
      [evidence.id, req.user.id]
    );

    if (existingReview) {
      return res.status(409).json({
        error:
          'You have already reviewed this evidence. Each account can review a file only once.',
        existingDecision: existingReview.decision
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

    const status = await getResolutionReviewStatus(
      db,
      evidence.id
    );

    const message = status.rejected
      ? 'A Verifier rejected this evidence. The Authority must upload replacement evidence.'
      : status.bothApproved
        ? 'Two distinct Verifiers approved the evidence. The Authority may proceed to resolve the complaint.'
        : `Review recorded. ${Math.max(
            0,
            2 - status.approvedVerifierCount
          )} additional Verifier approval(s) required.`;

    return res.status(201).json({
      message,
      review: {
        id: reviewId,
        evidence_id: evidence.id,
        reviewer_role: role,
        reviewer_id: req.user.id,
        decision,
        comments,
        created_at: now
      },
      reviewStatus: {
        approvedVerifierCount: status.approvedVerifierCount,
        requiredVerifierApprovals: 2,
        rejectedVerifierCount: status.rejectedVerifierCount,
        rejected: status.rejected,
        bothApproved: status.bothApproved,
        canProceedToResolution: status.canProceedToResolution,
        requiresReplacementEvidence: status.rejected,
        investigatorReviews: status.investigatorReviews,
        verifierReviews: status.verifierReviews
      }
    });
  } catch (err) {
    if (
      err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    ) {
      return res.status(409).json({
        error:
          'This account has already reviewed this evidence.'
      });
    }

    console.error('Review resolution evidence error:', err);

    return res.status(500).json({
      error: 'Failed to review resolution evidence'
    });
  }
}

/**
 * GET /api/evidence/:id/verify
 *
 * Verify the file's current SHA-256 hash against its stored hash.
 */
export async function verifyEvidence(req, res) {
  try {
    const db = getDb();

    const evidence = await db.get(
      `SELECT e.*, c.citizen_id
       FROM evidence e
       JOIN complaints c ON e.complaint_id = c.id
       WHERE e.id = ?`,
      [req.params.id]
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
    } catch {
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
        ? 'Evidence integrity verified - file has not been tampered with.'
        : 'HASH MISMATCH - evidence may have been altered or is missing.'
    });
  } catch (err) {
    console.error('Verify evidence error:', err);

    return res.status(500).json({
      error: 'Failed to verify evidence'
    });
  }
}
