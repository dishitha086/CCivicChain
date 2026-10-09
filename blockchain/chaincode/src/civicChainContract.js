'use strict';

const { Contract } = require('fabric-contract-api');

/**
 * CivicChainContract
 * Implements tamper-evident, privacy-preserving civic complaint state machine on Hyperledger Fabric.
 *
 * State Transitions:
 * REPORTED -> REGISTERED -> ASSIGNED -> INVESTIGATING -> VERIFIED -> ACTION_TAKEN -> RESOLVED -> RESOLUTION_VERIFIED -> CLOSED
 */
class CivicChainContract extends Contract {

  constructor() {
    super('CivicChainContract');
  }

  async initLedger(ctx) {
    console.info('============= START : Initialize Ledger ===========');
    console.info('CivicChain Ledger Initialized with Zero Genesis Violations');
    console.info('============= END : Initialize Ledger ===========');
  }

  // --- Helpers ---
  _getAllowedTransitions(currentStatus) {
    const transitions = {
      'REPORTED': ['REGISTERED'],
      'REGISTERED': ['ASSIGNED'],
      'ASSIGNED': ['INVESTIGATING'],
      'INVESTIGATING': ['VERIFIED'],
      'VERIFIED': ['ACTION_TAKEN'],
      'ACTION_TAKEN': ['RESOLVED'],
      'RESOLVED': ['RESOLUTION_VERIFIED'],
      'RESOLUTION_VERIFIED': ['CLOSED'],
      'CLOSED': []
    };
    return transitions[currentStatus] || [];
  }

  _validateTransition(currentStatus, targetStatus) {
    const allowed = this._getAllowedTransitions(currentStatus);
    if (!allowed.includes(targetStatus)) {
      throw new Error(`Invalid state transition from ${currentStatus} to ${targetStatus}. Allowed: [${allowed.join(', ')}]`);
    }
  }

  /**
   * createComplaint
   * Records a new complaint on-chain.
   * NOTE: PII is strictly kept off-chain; citizen is referenced by cryptographic SHA-256 hash.
   */
  async createComplaint(ctx, complaintId, category, title, descriptionHash, locationWard, citizenHash) {
    const exists = await this._complaintExists(ctx, complaintId);
    if (exists) {
      throw new Error(`Complaint ${complaintId} already exists on ledger`);
    }

    const txTimestamp = ctx.stub.getTxTimestamp();
    const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
    const txId = ctx.stub.getTxId();

    const complaintAsset = {
      docType: 'complaint',
      complaintId,
      category,
      title,
      descriptionHash,
      locationWard,
      citizenHash,
      status: 'REPORTED',
      department: '',
      assignedOfficer: '',
      assignedInvestigator: '',
      evidenceHashes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      txId
    };

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaintAsset)));

    // Emit event
    ctx.stub.setEvent('ComplaintCreated', Buffer.from(JSON.stringify({ complaintId, category, status: 'REPORTED' })));
    return JSON.stringify(complaintAsset);
  }

  /**
   * registerComplaint
   * Transition: REPORTED -> REGISTERED
   */
  async registerComplaint(ctx, complaintId, department, officerId) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'REGISTERED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'REGISTERED';
    complaint.department = department;
    complaint.assignedOfficer = officerId;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ComplaintRegistered', Buffer.from(JSON.stringify({ complaintId, department })));
    return JSON.stringify(complaint);
  }

  /**
   * assignComplaint
   * Transition: REGISTERED -> ASSIGNED
   */
  async assignComplaint(ctx, complaintId, investigatorId) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'ASSIGNED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'ASSIGNED';
    complaint.assignedInvestigator = investigatorId;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ComplaintAssigned', Buffer.from(JSON.stringify({ complaintId, investigatorId })));
    return JSON.stringify(complaint);
  }

  /**
   * startInvestigation
   * Transition: ASSIGNED -> INVESTIGATING
   */
  async startInvestigation(ctx, complaintId, investigatorId, notesHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'INVESTIGATING');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'INVESTIGATING';
    complaint.investigationNotesHash = notesHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('InvestigationStarted', Buffer.from(JSON.stringify({ complaintId, investigatorId })));
    return JSON.stringify(complaint);
  }

  /**
   * verifyComplaint
   * Transition: INVESTIGATING -> VERIFIED
   */
  async verifyComplaint(ctx, complaintId, verifierId, reportHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'VERIFIED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'VERIFIED';
    complaint.verifierId = verifierId;
    complaint.verificationReportHash = reportHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ComplaintVerified', Buffer.from(JSON.stringify({ complaintId, verifierId })));
    return JSON.stringify(complaint);
  }

  /**
   * takeAction
   * Transition: VERIFIED -> ACTION_TAKEN
   */
  async takeAction(ctx, complaintId, authorityId, actionNotesHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'ACTION_TAKEN');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'ACTION_TAKEN';
    complaint.actionNotesHash = actionNotesHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ActionTaken', Buffer.from(JSON.stringify({ complaintId, authorityId })));
    return JSON.stringify(complaint);
  }

  /**
   * resolveComplaint
   * Transition: ACTION_TAKEN -> RESOLVED
   */
  async resolveComplaint(ctx, complaintId, resolverId, resolutionHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'RESOLVED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'RESOLVED';
    complaint.resolutionHash = resolutionHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ComplaintResolved', Buffer.from(JSON.stringify({ complaintId })));
    return JSON.stringify(complaint);
  }

  /**
   * verifyResolution
   * Transition: RESOLVED -> RESOLUTION_VERIFIED
   */
  async verifyResolution(ctx, complaintId, verifierId, inspectionReportHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'RESOLUTION_VERIFIED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'RESOLUTION_VERIFIED';
    complaint.resolutionVerifierId = verifierId;
    complaint.inspectionReportHash = inspectionReportHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ResolutionVerified', Buffer.from(JSON.stringify({ complaintId, verifierId })));
    return JSON.stringify(complaint);
  }

  /**
   * closeComplaint
   * Transition: RESOLUTION_VERIFIED -> CLOSED
   */
  async closeComplaint(ctx, complaintId, closerId, closureNotesHash) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    this._validateTransition(complaint.status, 'CLOSED');

    const txTimestamp = ctx.stub.getTxTimestamp();
    complaint.status = 'CLOSED';
    complaint.closerId = closerId;
    complaint.closureNotesHash = closureNotesHash;
    complaint.updatedAt = new Date(txTimestamp.seconds.low * 1000).toISOString();
    complaint.txId = ctx.stub.getTxId();

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('ComplaintClosed', Buffer.from(JSON.stringify({ complaintId })));
    return JSON.stringify(complaint);
  }

  /**
   * recordEvidenceHash
   * Links a cryptographic hash of off-chain uploaded evidence to the on-chain complaint
   */
  async recordEvidenceHash(ctx, complaintId, evidenceHash, evidenceType) {
    const complaint = await this._getComplaintObj(ctx, complaintId);
    if (!complaint.evidenceHashes) {
      complaint.evidenceHashes = [];
    }
    complaint.evidenceHashes.push({
      hash: evidenceHash,
      type: evidenceType,
      txId: ctx.stub.getTxId(),
      timestamp: new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString()
    });

    await ctx.stub.putState(complaintId, Buffer.from(JSON.stringify(complaint)));
    ctx.stub.setEvent('EvidenceRecorded', Buffer.from(JSON.stringify({ complaintId, evidenceHash })));
    return JSON.stringify(complaint);
  }

  /**
   * getComplaint
   * Retrieves the current state of a complaint from the World State ledger
   */
  async getComplaint(ctx, complaintId) {
    const complaintAsBytes = await ctx.stub.getState(complaintId);
    if (!complaintAsBytes || complaintAsBytes.length === 0) {
      throw new Error(`Complaint ${complaintId} does not exist`);
    }
    return complaintAsBytes.toString();
  }

  /**
   * getComplaintHistory
   * Returns the complete immutable tamper-evident transaction history from the Fabric ledger
   */
  async getComplaintHistory(ctx, complaintId) {
    const iterator = await ctx.stub.getHistoryForKey(complaintId);
    const history = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        let record = {};
        record.txId = res.value.txId;
        record.timestamp = new Date(res.value.timestamp.seconds.low * 1000).toISOString();
        record.isDelete = res.value.isDelete;
        try {
          record.value = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          record.value = res.value.value.toString('utf8');
        }
        history.push(record);
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    return JSON.stringify(history);
  }

  async _complaintExists(ctx, complaintId) {
    const complaintAsBytes = await ctx.stub.getState(complaintId);
    return complaintAsBytes && complaintAsBytes.length > 0;
  }

  async _getComplaintObj(ctx, complaintId) {
    const complaintAsBytes = await ctx.stub.getState(complaintId);
    if (!complaintAsBytes || complaintAsBytes.length === 0) {
      throw new Error(`Complaint ${complaintId} does not exist on blockchain`);
    }
    return JSON.parse(complaintAsBytes.toString());
  }
}

module.exports = CivicChainContract;
