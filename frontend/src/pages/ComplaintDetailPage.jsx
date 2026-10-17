
import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  StatusBadge,
  PriorityBadge,
  LoadingSpinner,
  InfoRow
} from '../components/ui';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Shield,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACTION_CONFIG = {
  REPORTED: {
    action: 'register',
    label: 'Register Complaint',
    roles: ['AUTHORITY', 'ADMIN'],
    color: '#6366f1'
  },
  REGISTERED: {
    action: 'assign',
    label: 'Assign to Officer',
    roles: ['AUTHORITY', 'ADMIN'],
    color: '#f59e0b',
    needsAssign: true
  },
  ASSIGNED: {
    action: 'investigate',
    label: 'Start Investigation',
    roles: ['INVESTIGATOR', 'AUTHORITY', 'ADMIN'],
    color: '#06b6d4'
  },
  INVESTIGATING: {
    action: 'verify',
    label: 'Verify Investigation',
    roles: ['VERIFIER', 'ADMIN'],
    color: '#3b82f6'
  },
  VERIFIED: {
    action: 'action',
    label: 'Mark Action Taken',
    roles: ['AUTHORITY', 'ADMIN'],
    color: '#a855f7'
  },
  ACTION_TAKEN: {
    action: 'resolve',
    label: 'Mark as Resolved',
    roles: ['AUTHORITY', 'INVESTIGATOR', 'ADMIN'],
    needsResolution: true,
    color: '#10b981'
  },
  RESOLVED: {
    action: 'verify-resolution',
    label: 'Verify Resolution',
    roles: ['VERIFIER', 'CITIZEN', 'ADMIN'],
    color: '#10b981'
  },
  RESOLUTION_VERIFIED: {
    action: 'close',
    label: 'Close Complaint',
    roles: ['ADMIN', 'AUTHORITY'],
    color: '#64748b'
  }
};

const TERMINAL_STATUSES = [
  'RESOLVED',
  'RESOLUTION_VERIFIED',
  'CLOSED'
];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [notes, setNotes] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [verificationDetails, setVerificationDetails] = useState('');
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState('ORIGINAL');
  const [uploadLoading, setUploadLoading] = useState(false);


// Resolution photo state
const [resolutionPhoto, setResolutionPhoto] = useState(null);
const [resolutionPhotoUploaded, setResolutionPhotoUploaded] = useState(false);
const [resolutionPhotoUploading, setResolutionPhotoUploading] = useState(false);
  
  const [reviewComments, setReviewComments] = useState({});
  const [reviewLoadingId, setReviewLoadingId] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data)
  });

  const { data: histData } = useQuery({
    queryKey: ['complaint-history', id],
    queryFn: () => api.get(`/complaints/${id}/history`).then(r => r.data),
    enabled: showHistory
  });

  const { data: officersData } = useQuery({
    queryKey: ['officers'],
    queryFn: () => api.get('/users/officers').then(r => r.data),
    enabled: ['AUTHORITY', 'ADMIN'].includes(user?.role)
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 60
        }}
      >
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        Failed to load complaint
      </div>
    );
  }

  const {
    complaint,
    evidence = [],
    timeline = [],
    feedback
  } = data || {};

  if (!complaint) return null;

  const actionConfig = ACTION_CONFIG[complaint.status];

  const canAct =
    actionConfig &&
    actionConfig.roles.includes(user?.role);

  const canUploadResolution =
    ['AUTHORITY', 'ADMIN'].includes(user?.role) &&
    complaint.status === 'ACTION_TAKEN';

  const canUploadOriginal =
    !TERMINAL_STATUSES.includes(complaint.status) &&
    complaint.status !== 'CLOSED';

  const invalidateComplaintData = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['complaint', id] }),
      qc.invalidateQueries({ queryKey: ['complaints'] }),
      qc.invalidateQueries({ queryKey: ['citizen-dashboard'] }),
      qc.invalidateQueries({ queryKey: ['authority-dashboard'] }),
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    ]);
  };

  // Find the newest resolution-proof upload.
  const latestResolutionEvidence = [...evidence]
    .filter(ev => ev.evidence_type === 'RESOLUTION')
    .sort((a, b) => {
      const timeDifference =
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime();

      if (timeDifference !== 0) return timeDifference;

      return String(b.id).localeCompare(String(a.id));
    })[0];

  const latestReviews =
    latestResolutionEvidence?.reviews || [];

  const investigatorReview = latestReviews.find(
    review => review.reviewer_role === 'INVESTIGATOR'
  );

  const verifierReview = latestReviews.find(
    review => review.reviewer_role === 'VERIFIER'
  );

  const latestProofRejected =
    investigatorReview?.decision === 'REJECTED' ||
    verifierReview?.decision === 'REJECTED';

  const bothReviewsApproved =
    investigatorReview?.decision === 'APPROVED' &&
    verifierReview?.decision === 'APPROVED';

  const canProceedToResolution =
    complaint.status === 'ACTION_TAKEN' &&
    !!latestResolutionEvidence &&
    bothReviewsApproved &&
    !latestProofRejected;

  const handleAction = async () => {
    if (!actionConfig) return;

    if (
      actionConfig.needsResolution &&
      !canProceedToResolution
    ) {
      toast.error(
        'Upload resolution proof and obtain both Investigator and Verifier approvals first.'
      );
      return;
    }

    if (
      actionConfig.needsResolution &&
      !resolutionDetails.trim()
    ) {
      toast.error('Please enter the resolution details.');
      return;
    }

    setActionLoading(true);

    try {
      const payload = { notes };

      if (actionConfig.action === 'assign') {
        if (!assignOfficerId || !assignDept.trim()) {
          toast.error(
            'Please select an officer and department'
          );
          return;
        }

        payload.officer_id = assignOfficerId;
        payload.department = assignDept.trim();
      }

      if (actionConfig.needsResolution) {
        payload.resolution_details = resolutionDetails.trim();
      }

      if (actionConfig.action === 'verify') {
        payload.verification_details =
          verificationDetails.trim();
      }

      await api.put(
        `/complaints/${id}/${actionConfig.action}`,
        payload
      );

      toast.success(
        `✅ ${actionConfig.label} successful!`
      );

      await invalidateComplaintData();

      setNotes('');
      setResolutionDetails('');
      setVerificationDetails('');
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Action failed'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Select a file first');
      return;
    }

    // Validate the upload type and current user permissions.
    if (uploadType === 'RESOLUTION') {
      if (!canUploadResolution) {
        toast.error(
          'Only Authority or Admin can upload resolution proof when the complaint is ACTION_TAKEN.'
        );
        return;
      }

      if (!uploadFile.type.startsWith('image/')) {
        toast.error(
          'Resolution proof must be an image of the completed repair.'
        );
        return;
      }
    } else {
      if (!canUploadOriginal) {
        toast.error(
          'Evidence cannot be uploaded after the complaint reaches a terminal status.'
        );
        return;
      }
    }

    setUploadLoading(true);

    const fd = new FormData();

    fd.append('file', uploadFile);
    fd.append('evidence_type', uploadType);

    if (uploadDesc.trim()) {
      fd.append('description', uploadDesc.trim());
    }

    try {
      const { data: response } = await api.post(
        `/complaints/${id}/evidence`,
        fd
      );

      const hash = response.evidence?.sha256_hash;

      toast.success(
        `${uploadType === 'RESOLUTION'
          ? 'Resolution proof'
          : 'Evidence'} uploaded successfully!` +
        (hash ? ` SHA-256: ${hash.slice(0, 16)}...` : '')
      );

      await invalidateComplaintData();

      setUploadFile(null);
      setUploadDesc('');
      setUploadType('ORIGINAL');

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Upload failed'
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReview = async (evidenceId, decision) => {
    const comments =
      (reviewComments[evidenceId] || '').trim();

    if (!comments) {
      toast.error('Please provide review comments');
      return;
    }

    setReviewLoadingId(evidenceId);

    try {
      await api.post(
        `/evidence/${evidenceId}/review`,
        { decision, comments }
      );

      toast.success(
        decision === 'APPROVED'
          ? 'Resolution proof approved!'
          : 'Resolution proof rejected. Replacement proof is required.'
      );

      setReviewComments(previous => ({
        ...previous,
        [evidenceId]: ''
      }));

      await invalidateComplaintData();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Review submission failed'
      );
    } finally {
      setReviewLoadingId(null);
    }
  };

  const verifyEvidence = async evidenceId => {
    try {
      const { data: response } = await api.get(
        `/evidence/${evidenceId}/verify`
      );

      if (response.isIntact) {
        toast.success(
          '✅ Evidence integrity verified — file has not been tampered with'
        );
      } else {
        toast.error(
          '❌ Hash mismatch — possible tampering detected!'
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Integrity verification failed'
      );
    }
  };

  const handleFeedback = async () => {
    if (!feedbackComment.trim()) {
      toast.error('Please enter a feedback comment');
      return;
    }

    setFeedbackLoading(true);

    try {
      await api.post(`/complaints/${id}/feedback`, {
        rating,
        comments: feedbackComment.trim()
      });

      toast.success('Feedback recorded successfully!');

      await invalidateComplaintData();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Failed to submit feedback'
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  const renderReviewStatus = (role, review) => (
    <div
      key={role}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        fontSize: '0.8rem'
      }}
    >
      <span>
        {role === 'INVESTIGATOR'
          ? 'Investigator'
          : 'Verifier'}
      </span>

      <span
        style={{
          color: !review
            ? 'var(--text-muted)'
            : review.decision === 'APPROVED'
              ? '#34d399'
              : '#f87171',
          fontWeight: 600
        }}
      >
        {!review
          ? 'Pending review'
          : review.decision === 'APPROVED'
            ? '✓ Approved'
            : '✕ Rejected'}
      </span>
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>
            {complaint.title}
          </h1>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginTop: 6,
              flexWrap: 'wrap'
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '0.82rem',
                color: 'var(--accent)'
              }}
            >
              {complaint.complaint_number}
            </span>

            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />

            {complaint.is_anonymous && (
              <span
                className="badge"
                style={{
                  background: 'rgba(100,116,139,0.15)',
                  color: '#94a3b8'
                }}
              >
                Anonymous
              </span>
            )}
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* LEFT COLUMN */}
        <div>
          {/* Complaint details */}
          <div
            className="card"
            style={{ marginBottom: 16 }}
          >
            <div className="section-title">
              Complaint Details
            </div>

            <InfoRow
              label="Category"
              value={complaint.category}
            />

            <InfoRow
              label="Description"
              value={
                <span
                  style={{
                    lineHeight: 1.7,
                    color: 'var(--text-primary)'
                  }}
                >
                  {complaint.description}
                </span>
              }
            />

            <InfoRow
              label="Location"
              value={complaint.location}
            />

            {complaint.latitude != null && (
              <InfoRow
                label="Coordinates"
                value={
                  <span
                    className="font-mono"
                    style={{
                      color: 'var(--primary)',
                      fontSize: '0.85rem'
                    }}
                  >
                    {complaint.latitude}, {complaint.longitude}
                  </span>
                }
              />
            )}

            {complaint.assigned_department && (
              <InfoRow
                label="Assigned Department"
                value={complaint.assigned_department}
              />
            )}

            {complaint.officer_name && (
              <InfoRow
                label="Assigned Officer"
                value={complaint.officer_name}
              />
            )}

            {complaint.investigator_name && (
              <InfoRow
                label="Investigator"
                value={complaint.investigator_name}
              />
            )}

            {complaint.resolution_details && (
              <InfoRow
                label="Resolution"
                value={complaint.resolution_details}
              />
            )}

            <InfoRow
              label="Submitted"
              value={format(
                new Date(complaint.created_at),
                'dd MMM yyyy HH:mm'
              )}
            />

            <InfoRow
              label="Last Updated"
              value={format(
                new Date(complaint.updated_at),
                'dd MMM yyyy HH:mm'
              )}
            />

            {complaint.blockchain_tx_id && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 'var(--radius)'
                }}
              >
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                    fontWeight: 700,
                    marginBottom: 4
                  }}
                >
                  ⛓ Cryptographic Ledger Transaction
                </div>

                <div
                  className="font-mono"
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--primary)',
                    wordBreak: 'break-all'
                  }}
                >
                  {complaint.blockchain_tx_id}
                </div>
              </div>
            )}
          </div>

          {/* Evidence and resolution-proof workflow */}
          <div
            className="card"
            style={{ marginBottom: 16 }}
          >
            <div className="section-title">
              Evidence ({evidence.length})
            </div>

            {evidence.length === 0 && (
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}
              >
                No evidence has been uploaded yet.
              </p>
            )}

            {evidence.map(ev => {
              const isResolution =
                ev.evidence_type === 'RESOLUTION';

              const isLatestResolution =
                isResolution &&
                ev.id === latestResolutionEvidence?.id;

              const reviews = ev.reviews || [];

              const investigator = reviews.find(
                review =>
                  review.reviewer_role === 'INVESTIGATOR'
              );

              const verifier = reviews.find(
                review =>
                  review.reviewer_role === 'VERIFIER'
              );

              const alreadyReviewed = reviews.some(
                review =>
                  review.reviewer_role === user?.role
              );

              const canReview =
                isLatestResolution &&
                ['INVESTIGATOR', 'VERIFIER'].includes(
                  user?.role
                ) &&
                !alreadyReviewed &&
                !TERMINAL_STATUSES.includes(
                  complaint.status
                );

              const reviewLoading =
                reviewLoadingId === ev.id;

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  {/* Evidence file details */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {ev.original_name}

                        <span
                          className="badge"
                          style={{
                            marginLeft: 8,
                            display: 'inline-block',
                            background: isResolution
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(59,130,246,0.12)',
                            color: isResolution
                              ? '#34d399'
                              : '#60a5fa'
                          }}
                        >
                          {isResolution
                            ? 'Resolution Proof'
                            : 'Original Evidence'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: 4
                        }}
                      >
                        {ev.mime_type}
                        {' • '}
                        {(
                          (ev.file_size || 0) / 1024
                        ).toFixed(1)} KB
                        {' • '}
                        {ev.uploaded_by_name}
                      </div>

                      <div
                        className="font-mono"
                        style={{
                          fontSize: '0.68rem',
                          color: '#67e8f9',
                          marginTop: 4,
                          overflowWrap: 'anywhere'
                        }}
                      >
                        SHA-256:{' '}
                        {ev.sha256_hash ||
                          ev.hash ||
                          'Unavailable'}
                      </div>

                      {ev.description && (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginTop: 4
                          }}
                        >
                          {ev.description}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexShrink: 0
                      }}
                    >
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => verifyEvidence(ev.id)}
                        title="Verify file integrity, not human approval"
                      >
                        <Shield size={14} />
                        Verify
                      </button>

                      {ev.filename && (
                        <a
                          href={`/uploads/evidence/${encodeURIComponent(ev.filename)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          title="Open evidence file"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Image preview */}
                  {ev.mime_type?.startsWith('image/') &&
                    ev.filename && (
                      <a
                        href={`/uploads/evidence/${encodeURIComponent(ev.filename)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View full-size image"
                        style={{
                          display: 'block',
                          marginTop: 12,
                          maxWidth: '100%'
                        }}
                      >
                        <img
                          src={`/uploads/evidence/${encodeURIComponent(ev.filename)}`}
                          alt={
                            ev.original_name ||
                            'Uploaded evidence'
                          }
                          style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: 420,
                            maxHeight: 300,
                            objectFit: 'contain',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            background: '#0f172a',
                            cursor: 'pointer'
                          }}
                          onError={e => {
                            e.currentTarget.style.display =
                              'none';
                          }}
                        />
                      </a>
                    )}

                  {/* Resolution proof review panel */}
                  {isResolution && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          marginBottom: 8
                        }}
                      >
                        Independent Review

                        {!isLatestResolution && (
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontWeight: 400,
                              marginLeft: 8
                            }}
                          >
                            Previous proof
                          </span>
                        )}
                      </div>

                      {renderReviewStatus(
                        'INVESTIGATOR',
                        investigator
                      )}

                      {renderReviewStatus(
                        'VERIFIER',
                        verifier
                      )}

                      {reviews.map(review =>
                        review.comments ? (
                          <div
                            key={review.id}
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--text-muted)',
                              marginTop: 6,
                              overflowWrap: 'anywhere'
                            }}
                          >
                            <strong>
                              {review.reviewer_role} comments:
                            </strong>
                            {' '}
                            {review.comments}
                          </div>
                        ) : null
                      )}

                      {isLatestResolution &&
                        latestProofRejected && (
                          <div
                            className="alert alert-error"
                            style={{
                              marginTop: 10,
                              fontSize: '0.8rem'
                            }}
                          >
                            This proof was rejected. The Authority
                            must upload replacement proof for fresh
                            reviews.
                          </div>
                        )}

                      {isLatestResolution &&
                        bothReviewsApproved &&
                        !latestProofRejected && (
                          <div
                            className="alert alert-success"
                            style={{
                              marginTop: 10,
                              fontSize: '0.8rem'
                            }}
                          >
                            <CheckCircle
                              size={15}
                              style={{
                                verticalAlign: 'middle'
                              }}
                            />
                            {' '}
                            Both reviewers approved this proof.
                          </div>
                        )}

                      {canReview && (
                        <div style={{ marginTop: 12 }}>
                          <textarea
                            className="form-input"
                            rows={2}
                            placeholder="Enter review comments (required)"
                            value={
                              reviewComments[ev.id] || ''
                            }
                            onChange={e =>
                              setReviewComments(previous => ({
                                ...previous,
                                [ev.id]: e.target.value
                              }))
                            }
                            style={{
                              marginBottom: 8,
                              fontSize: '0.82rem'
                            }}
                          />

                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={
                                reviewLoading ||
                                !(reviewComments[ev.id] || '')
                                  .trim()
                              }
                              onClick={() =>
                                handleReview(
                                  ev.id,
                                  'APPROVED'
                                )
                              }
                            >
                              {reviewLoading
                                ? <LoadingSpinner size={14} />
                                : <CheckCircle size={14} />}
                              Approve
                            </button>

                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={
                                reviewLoading ||
                                !(reviewComments[ev.id] || '')
                                  .trim()
                              }
                              onClick={() =>
                                handleReview(
                                  ev.id,
                                  'REJECTED'
                                )
                              }
                              style={{ color: '#f87171' }}
                            >
                              <AlertTriangle size={14} />
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {isLatestResolution &&
                        !TERMINAL_STATUSES.includes(
                          complaint.status
                        ) &&
                        [
                          'INVESTIGATOR',
                          'VERIFIER'
                        ].includes(user?.role) &&
                        alreadyReviewed && (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              marginTop: 10
                            }}
                          >
                            You have already reviewed this proof.
                            A new upload is required before another
                            review can be submitted.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius)',
                border: '1px dashed var(--border)'
              }}
            >
              
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  marginBottom: 6
                }}
              >
                Upload Evidence
              </div>
                  
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: 12
                }}
              >
                Original evidence documents the reported issue.
                Resolution proof must be a photo of the completed
                repair and must be approved by both reviewers.
              </p>

              
              {/* Preview selected image before upload */}
              {/* Preview selected image before upload */}
{uploadFile?.type?.startsWith('image/') && (
  <div style={{ marginBottom: 12 }}>
    <p
      style={{
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        marginBottom: 8
      }}
    >
      Selected image — {uploadFile.name}
    </p>

    <img
      src={URL.createObjectURL(uploadFile)}
      alt={`Preview of ${uploadFile.name}`}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: 420,
        maxHeight: 300,
        objectFit: 'contain',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: '#0f172a'
      }}
    />
  </div>
)}
               

             

              <input
                id="evidenceFile"
                ref={fileRef}
                type="file"
                accept={
                  uploadType === 'RESOLUTION'
                    ? 'image/jpeg,image/png,image/webp,image/gif'
                    : 'image/*,video/*,.pdf,.doc,.docx'
                }
                capture={
                  uploadType === 'RESOLUTION'
                    ? 'environment'
                    : undefined
                }
                onChange={e =>
                  setUploadFile(
                    e.target.files?.[0] || null
                  )
                }
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '0.85rem',
                  marginBottom: 10,
                  color: 'var(--text-secondary)'
                }}
              />

              <input
                className="form-input"
                placeholder={
                  uploadType === 'RESOLUTION'
                    ? 'Describe the completed repair (optional)'
                    : 'Description (optional)'
                }
                value={uploadDesc}
                onChange={e =>
                  setUploadDesc(e.target.value)
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                  fontSize: '0.85rem'
                }}
              />

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleUpload}
                disabled={
                  !uploadFile ||
                  uploadLoading ||
                  (uploadType === 'RESOLUTION' &&
                    (!canUploadResolution ||
                      !uploadFile.type.startsWith('image/'))) ||
                  (uploadType === 'ORIGINAL' &&
                    !canUploadOriginal)
                }
              >
                {uploadLoading
                  ? (
                    <>
                      <LoadingSpinner size={14} />
                      Uploading...
                    </>
                  )
                  : (
                    <>
                      <Upload size={14} />
                      {uploadType === 'RESOLUTION'
                        ? 'Upload Resolution Photo'
                        : 'Upload & Hash'}
                    </>
                  )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: actions, feedback and timeline */}
        <div>
          {/* Action panel */}
          {canAct && complaint.status !== 'CLOSED' && (
            <div
              className="card"
              style={{
                marginBottom: 16,
                border: `1px solid ${actionConfig.color}30`
              }}
            >
              <div
                className="section-title"
                style={{
                  borderBottomColor:
                    `${actionConfig.color}20`
                }}
              >
                🔧 Available Action
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  background: `${actionConfig.color}10`,
                  borderRadius: 'var(--radius)',
                  marginBottom: 14
                }}
              >
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: actionConfig.color
                  }}
                >
                  {actionConfig.label}
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginTop: 2
                  }}
                >
                  Status: {complaint.status} →{' '}
                  {actionConfig.action
                    .toUpperCase()
                    .replace('-', '_')}
                </div>
              </div>

              {actionConfig.action === 'assign' && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Assign Officer
                    </label>

                    <select
                      className="form-input"
                      value={assignOfficerId}
                      onChange={e =>
                        setAssignOfficerId(e.target.value)
                      }
                    >
                      <option value="">
                        Select officer
                      </option>

                      {officersData?.officers?.map(o => (
                        <option
                          key={o.id}
                          value={o.id}
                        >
                          {o.name} ({o.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Department
                    </label>

                    <input
                      className="form-input"
                      placeholder="Department name"
                      value={assignDept}
                      onChange={e =>
                        setAssignDept(e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {actionConfig.action === 'verify' && (
                <div className="form-group">
                  <label className="form-label">
                    Verification Details
                  </label>

                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe your verification findings..."
                    value={verificationDetails}
                    onChange={e =>
                      setVerificationDetails(e.target.value)
                    }
                  />
                </div>
              )}

              {actionConfig.needsResolution && (
                <div className="form-group">
                  <label className="form-label">
                    Resolution Details *
                  </label>

                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe what actions were taken to resolve..."
                    value={resolutionDetails}
                    onChange={e =>
                      setResolutionDetails(e.target.value)
                    }
                  />

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: canProceedToResolution
                        ? '#34d399'
                        : '#fbbf24',
                      marginTop: 6
                    }}
                  >
                    {canProceedToResolution
                      ? '✓ Both reviewers approved the latest resolution proof.'
                      : 'Resolution is blocked until the latest proof is uploaded and approved by both reviewers.'}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Notes (Optional)
                </label>

                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Additional notes for the audit trail..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleAction}
                disabled={
                  actionLoading ||
                  (
                    actionConfig.needsResolution &&
                    !canProceedToResolution
                  )
                }
                style={{
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                {actionLoading
                  ? (
                    <>
                      <LoadingSpinner size={16} />
                      Processing...
                    </>
                  )
                  : `⛓ ${actionConfig.label}`}
              </button>
            </div>
          )}

          {complaint.status === 'CLOSED' && (
            <div className="alert alert-success">
              ✅ This complaint has been closed successfully.
            </div>
          )}

          {/* Citizen feedback display */}
          {feedback && (
            <div
              className="card"
              style={{
                borderLeft: '4px solid #f59e0b',
                marginBottom: 16
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#fbbf24'
                  }}
                >
                  Citizen Resolution Feedback
                </div>

                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      style={{
                        color:
                          star <= feedback.rating
                            ? '#f59e0b'
                            : '#475569',
                        fontSize: '1.1rem'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <p
                style={{
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  margin: '6px 0'
                }}
              >
                "{feedback.comments ||
                  'No written comment provided'}"
              </p>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <span>Submitted by Citizen</span>

                <span className="font-mono">
                  TX: {feedback.blockchain_tx_id?.slice(0, 24)}...
                </span>
              </div>
            </div>
          )}

          {/* Citizen feedback form */}
          {!feedback &&
            [
              'RESOLVED',
              'RESOLUTION_VERIFIED',
              'CLOSED'
            ].includes(complaint.status) &&
            user?.role === 'CITIZEN' && (
              <div
                className="card"
                style={{
                  border: '1px solid rgba(245,158,11,0.3)',
                  marginBottom: 16
                }}
              >
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    marginBottom: 8,
                    color: '#fbbf24'
                  }}
                >
                  ★ Rate Resolution Quality & Service
                </div>

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 12
                  }}
                >
                  Share feedback on repair quality, timeliness,
                  or officer conduct.
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 12,
                    flexWrap: 'wrap'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Satisfaction Rating:
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.4rem',
                          color:
                            num <= rating
                              ? '#f59e0b'
                              : '#475569',
                          padding: 2
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#f59e0b'
                    }}
                  >
                    {rating} of 5 Stars
                  </span>
                </div>

                <div
                  className="form-group"
                  style={{ marginBottom: 12 }}
                >
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Share your feedback..."
                    value={feedbackComment}
                    onChange={e =>
                      setFeedbackComment(e.target.value)
                    }
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleFeedback}
                  disabled={feedbackLoading}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background:
                      'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                  }}
                >
                  {feedbackLoading
                    ? <LoadingSpinner size={16} />
                    : '⛓ Submit Feedback'}
                </button>
              </div>
            )}

          {/* Audit timeline */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                flexWrap: 'wrap'
              }}
            >
              <div
                className="section-title"
                style={{
                  margin: 0,
                  border: 0,
                  padding: 0
                }}
              >
                Audit Timeline
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setShowHistory(previous => !previous)
                }
              >
                {showHistory
                  ? 'Show Simple'
                  : '⛓ Show Blockchain Records'}
              </button>
            </div>

            <div className="timeline">
              {timeline.map((event, i) => (
                <div
                  className="timeline-item"
                  key={event.id}
                >
                  <div
                    className={`timeline-dot ${
                      i === timeline.length - 1
                        ? 'active'
                        : ''
                    }`}
                  />

                  <div className="timeline-content">
                    <div className="timeline-date">
                      {format(
                        new Date(event.created_at),
                        'dd MMM yyyy HH:mm:ss'
                      )}
                    </div>

                    <div className="timeline-status">
                      {event.to_status?.replace(/_/g, ' ')}
                    </div>

                    <div className="timeline-actor">
                      by {event.performer_name} (
                      {event.performer_role})
                    </div>

                    {event.notes && (
                      <div className="timeline-notes">
                        "{event.notes}"
                      </div>
                    )}

                    {event.blockchain_tx_id &&
                      event.blockchain_tx_id !== 'PENDING' && (
                        <div
                          className="font-mono"
                          style={{
                            fontSize: '0.68rem',
                            color: '#67e8f9',
                            marginTop: 6,
                            overflowWrap: 'anywhere'
                          }}
                        >
                          TX: {event.blockchain_tx_id.slice(0, 50)}...
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {showHistory &&
              histData?.blockchainRecords && (
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: 10,
                      color: '#67e8f9'
                    }}
                  >
                    ⛓ Blockchain Records
                  </div>

                  {histData.blockchainRecords.map(rec => (
                    <div
                      key={rec.id}
                      className="blockchain-record"
                    >
                      <div className="blockchain-record-header">
                        <span className="blockchain-label">
                          {rec.event_type}
                        </span>

                        <span>
                          Block #{rec.block_number}
                        </span>
                      </div>

                      <div>TX: {rec.tx_id}</div>
                      <div>Hash: {rec.payload_hash}</div>

                      <div style={{ opacity: 0.6 }}>
                        {format(
                          new Date(rec.timestamp),
                          'dd MMM yyyy HH:mm:ss'
                        )}
                        {' '}[{rec.mode}]
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
