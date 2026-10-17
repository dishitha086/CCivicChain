
import { useState } from "react";
import {
  ShieldCheck,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Eye,
} from "lucide-react";

export default function ResolutionEvidenceReview({
  role,
  evidence,
  reviews = [],
  onSubmitReview,
  loading = false,
}) {
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState("");

  const normalizedRole = String(role || "").toUpperCase();
  const isInvestigator = normalizedRole === "INVESTIGATOR";
  const isVerifier = normalizedRole === "VERIFIER";
  const canReview = isInvestigator || isVerifier;

  const myReview = reviews.find(
    (review) =>
      String(review.reviewer_role || "").toUpperCase() === normalizedRole
  );

  const investigatorReview = reviews.find(
    (review) =>
      String(review.reviewer_role || "").toUpperCase() === "INVESTIGATOR"
  );

  const verifierReview = reviews.find(
    (review) =>
      String(review.reviewer_role || "").toUpperCase() === "VERIFIER"
  );

  const photoUrl = evidence?.url || evidence?.file_url || evidence?.file_path;
  const photoName = evidence?.filename || "Resolution photo";
  const reviewStatus = String(evidence?.review_status || "PENDING").toUpperCase();

  const statusStyle = {
    APPROVED: "re-approved",
    REJECTED: "re-rejected",
    PENDING: "re-pending",
  }[reviewStatus] || "re-pending";

  async function submitReview() {
    if (!decision || !comment.trim()) {
      window.alert("Please select a decision and enter your review comments.");
      return;
    }

    if (!evidence?.id) {
      window.alert("The resolution evidence ID is missing.");
      return;
    }

    await onSubmitReview({
      evidenceId: evidence.id,
      decision,
      comment: comment.trim(),
      role: normalizedRole,
    });

    setComment("");
    setDecision("");
  }

  return (
    <section className="re-panel">
      <div className="re-heading">
        <div className="re-heading-icon">
          <ShieldCheck size={19} />
        </div>

        <div className="re-heading-copy">
          <h3>Resolution Evidence</h3>
          <p>Complaint #{evidence?.complaint_id ?? "—"}</p>
        </div>

        <span className={`re-status ${statusStyle}`}>
          {reviewStatus === "APPROVED"
            ? "Approved"
            : reviewStatus === "REJECTED"
              ? "Rejected"
              : "Pending Review"}
        </span>
      </div>

      <div className="re-photo-section">
        <div className="re-section-title">
          <ImageIcon size={15} />
          Uploaded repair photo
        </div>

        {photoUrl ? (
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer"
            className="re-photo-link"
          >
            <img
              src={photoUrl}
              alt="Authority's resolution evidence"
              className="re-photo"
            />
            <span className="re-view-photo">
              <Eye size={14} /> View full photo
            </span>
          </a>
        ) : (
          <div className="re-no-photo">
            <Camera size={27} />
            <p>Resolution photo is not available.</p>
          </div>
        )}

        <div className="re-file-info">
          <div>
            <span className="re-label">FILE NAME</span>
            <p>{photoName}</p>
          </div>

          <div>
            <span className="re-label">UPLOADED BY</span>
            <p>{evidence?.uploader_name || "Authority"}</p>
          </div>

          {evidence?.sha256 && (
            <div className="re-hash">
              <span className="re-label">SHA-256 HASH</span>
              <code>{evidence.sha256}</code>
            </div>
          )}
        </div>
      </div>

      <div className="re-review-summary">
        <div className="re-review-row">
          <div className="re-review-icon">
            {investigatorReview?.decision === "APPROVE" ||
            investigatorReview?.decision === "APPROVED" ? (
              <CheckCircle size={17} />
            ) : investigatorReview?.decision === "REJECT" ||
              investigatorReview?.decision === "REJECTED" ? (
              <XCircle size={17} />
            ) : (
              <Clock size={17} />
            )}
          </div>

          <div className="re-review-copy">
            <strong>Investigator Review</strong>
            <p>
              {investigatorReview
                ? `${investigatorReview.decision} — ${investigatorReview.comment || "No comment"}`
                : "Waiting for Investigator review"}
            </p>
          </div>
        </div>

        <div className="re-review-row">
          <div className="re-review-icon">
            {verifierReview?.decision === "APPROVE" ||
            verifierReview?.decision === "APPROVED" ? (
              <CheckCircle size={17} />
            ) : verifierReview?.decision === "REJECT" ||
              verifierReview?.decision === "REJECTED" ? (
              <XCircle size={17} />
            ) : (
              <Clock size={17} />
            )}
          </div>

          <div className="re-review-copy">
            <strong>Independent Verifier Review</strong>
            <p>
              {verifierReview
                ? `${verifierReview.decision} — ${verifierReview.comment || "No comment"}`
                : "Waiting for Verifier review"}
            </p>
          </div>
        </div>
      </div>

      {canReview && (
        <div className="re-review-form">
          <div className="re-form-heading">
            <h4>
              Your Review ({isInvestigator ? "Investigator" : "Verifier"})
            </h4>
            <span className={`re-status ${myReview ? "re-approved" : "re-pending"}`}>
              {myReview ? "Review Submitted" : "Action Required"}
            </span>
          </div>

          <p className="re-instruction">
            {isInvestigator
              ? "Check whether the repair is complete and the photo provides sufficient proof."
              : "Independently verify the repair photo. Review the evidence yourself before deciding."}
          </p>

          {isVerifier && (
            <div className="re-independence-note">
              <ShieldCheck size={15} />
              Your decision must be independent of the Investigator's decision.
            </div>
          )}

          {myReview ? (
            <div className="re-existing-review">
              <strong>Your recorded decision: {myReview.decision}</strong>
              <p>{myReview.comment}</p>
              <small>Contact your administrator if a review needs correction.</small>
            </div>
          ) : (
            <>
              <label className="re-label" htmlFor="re-comment">
                Review comments <span>*</span>
              </label>

              <textarea
                id="re-comment"
                className="re-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain why you approve or reject this repair photo..."
                maxLength={1000}
                required
              />

              <div className="re-char-count">{comment.length}/1000</div>

              <div className="re-decision-buttons">
                <button
                  type="button"
                  className={`re-approve-btn ${decision === "APPROVE" ? "re-selected" : ""}`}
                  onClick={() => setDecision("APPROVE")}
                  disabled={loading}
                >
                  <CheckCircle size={16} />
                  Approve Photo
                </button>

                <button
                  type="button"
                  className={`re-reject-btn ${decision === "REJECT" ? "re-selected" : ""}`}
                  onClick={() => setDecision("REJECT")}
                  disabled={loading}
                >
                  <XCircle size={16} />
                  Reject Photo
                </button>
              </div>

              <button
                type="button"
                className="re-submit-btn"
                onClick={submitReview}
                disabled={loading || !decision || !comment.trim()}
              >
                {loading ? "Submitting Review..." : "Submit Review"}
              </button>
            </>
          )}

          <p className="re-audit-note">
            Decisions and comments should be recorded in the complaint audit trail.
          </p>
        </div>
      )}

      {!canReview && (
        <div className="re-readonly-note">
          <Eye size={16} />
          You can view the evidence and review history, but cannot submit a
          review using this account.
        </div>
      )}
    </section>
  );
}
