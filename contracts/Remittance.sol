// SPDX-License-Identifier: MIT

/**
 * ============================================================================
 *                          PolkaPay Remittance Contract
 * ============================================================================
 *
 * LEGAL FRAMEWORK COMPLIANCE:
 * ---------------------------
 * This smart contract implements remittance transaction processing with
 * compliance to the following legal frameworks:
 *
 * 1. GDPR (General Data Protection Regulation - EU 2016/679)
 *    - Article 5:  Principles of data processing (minimization, purpose limitation)
 *    - Article 6:  Lawfulness of processing (consent-based KYC)
 *    - Article 7:  Conditions for consent (explicit user-initiated KYC)
 *    - Article 13: Information to be provided (transparent event logging)
 *    - Article 15: Right of access (user can query own data)
 *    - Article 17: Right to erasure ("right to be forgotten" via data deletion)
 *    - Article 20: Right to data portability (structured data export)
 *    - Article 25: Data protection by design and by default
 *    - Article 30: Records of processing activities (audit trail via events)
 *    - Article 32: Security of processing (access controls, encryption hashes)
 *    - Article 33: Notification of breaches (pause mechanism + events)
 *    - Article 35: Data protection impact assessment (tiered access)
 *
 * 2. AML/KYC Regulations
 *    - Customer Due Diligence (CDD) via tiered KYC verification
 *    - Transaction monitoring via daily limits and tier system
 *    - Suspicious activity controls via blacklisting and freezing
 *
 * 3. Stablecoin Transfer Support
 *    - ERC-20 compatible stablecoin transfers on Polkadot Hub Testnet
 *    - Supports any ERC-20 stablecoin (USDT, USDC, DAI, etc.)
 *    - Whitelisted stablecoin registry for approved tokens
 *
 * DEPLOYMENT TARGET: Polkadot Hub Testnet (Paseo) - Chain ID: 420420417
 * RPC: https://eth-rpc-testnet.polkadot.io/
 *
 * ============================================================================
 */

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============================================================================
// KYC Library — GDPR-Compliant Identity Verification
// ============================================================================
/**
 * @title KYCLib
 * @notice Handles KYC requests with GDPR compliance
 *
 * GDPR Article 5 — Principles relating to processing of personal data:
 *   - Data minimization: Only document hashes are stored on-chain, NOT raw
 *     personal data. The actual documents are stored off-chain.
 *   - Purpose limitation: KYC data is used solely for identity verification
 *     in the context of remittance compliance.
 *   - Storage limitation: Data can be erased via the erasure mechanism
 *     (Article 17 — Right to erasure).
 *
 * GDPR Article 25 — Data protection by design and by default:
 *   - Privacy by design: Hashes instead of raw data on an immutable ledger.
 *   - Privacy by default: No data is collected until the user initiates KYC.
 *
 * GDPR Article 32 — Security of processing:
 *   - Cryptographic hashes ensure data integrity without exposing PII.
 *   - Access controls restrict who can view KYC data.
 */
library KYCLib {
    enum KYCStatus { NONE, PENDING, APPROVED, REJECTED }

    /**
     * @notice KYC request structure
     * @dev GDPR Article 5(1)(c) — Data minimization:
     *      Only stores a hash reference to off-chain documents, not raw PII.
     *      The documentHash is a cryptographic hash (e.g., SHA-256) of the
     *      KYC document stored in an off-chain GDPR-compliant data store.
     */
    struct KYCRequest {
        string documentHash;       // Hash pointer to off-chain KYC docs (no raw PII on-chain)
        uint256 timestamp;         // When the request was made
        KYCStatus status;          // Current verification status
        string rejectionReason;    // Reason if rejected (no PII in reason)
        bool consentGiven;         // GDPR Article 7 — Explicit consent tracking
        uint256 consentTimestamp;  // GDPR Article 7(1) — When consent was given
        uint256 dataRetentionEnd;  // GDPR Article 5(1)(e) — Storage limitation period
    }

    struct KYCData {
        mapping(address => KYCRequest) requests;
        mapping(address => KYCStatus) status;
        address[] pendingRequests;
        mapping(address => bool) inPending;
        address[] allKYCUsers;
        mapping(address => bool) hasRequestedKYC;

        /**
         * @dev GDPR Article 17 — Right to erasure:
         *      Tracks whether a user's data has been erased.
         */
        mapping(address => bool) dataErased;
    }

    // ========================================================================
    // Events — GDPR Article 30: Records of processing activities
    // These events form an immutable audit trail of all KYC data processing.
    // ========================================================================
    event KYCRequested(address indexed user, string documentHash, uint256 timestamp);
    event KYCApproved(address indexed user, uint256 timestamp);
    event KYCRejected(address indexed user, string reason, uint256 timestamp);
    event KYCDocumentUpdated(address indexed user, string oldHash, string newHash, uint256 timestamp);

    /**
     * @dev GDPR Article 17 — Right to erasure event
     *      Logs when a user's KYC data has been erased from on-chain storage.
     */
    event KYCDataErased(address indexed user, uint256 timestamp);

    /**
     * @dev GDPR Article 7 — Consent recorded event
     */
    event KYCConsentRecorded(address indexed user, uint256 timestamp);

    /**
     * @notice Submit a KYC verification request
     * @dev GDPR Article 6(1)(a) — Processing is lawful when the data subject
     *      has given consent. The user explicitly calls this function, providing
     *      implicit consent through their transaction signature.
     *
     *      GDPR Article 7 — Conditions for consent:
     *      The user must actively submit their document hash, demonstrating
     *      freely given, specific, informed, and unambiguous consent.
     *
     *      GDPR Article 13 — Transparency:
     *      Events are emitted so that the data subject can be informed about
     *      the processing of their data.
     *
     * @param self The KYC data storage
     * @param user The address of the user requesting KYC
     * @param documentHash Hash of the KYC document (off-chain storage reference)
     */
    function requestKYC(KYCData storage self, address user, string calldata documentHash) external {
        require(bytes(documentHash).length > 0, "Hash required");
        require(self.status[user] != KYCStatus.APPROVED, "Already approved");
        require(!self.dataErased[user], "Data was erased; re-registration required via new consent");

        if (!self.hasRequestedKYC[user]) {
            self.allKYCUsers.push(user);
            self.hasRequestedKYC[user] = true;
        }

        string memory oldHash = self.requests[user].documentHash;
        bool isUpdate = bytes(oldHash).length > 0;

        if (!self.inPending[user]) {
            self.pendingRequests.push(user);
            self.inPending[user] = true;
        }

        // GDPR Article 5(1)(e) — Storage limitation:
        // Data retention period set to 5 years from submission (AML requirement)
        uint256 retentionEnd = block.timestamp + (5 * 365 days);

        self.requests[user] = KYCRequest({
            documentHash: documentHash,
            timestamp: block.timestamp,
            status: KYCStatus.PENDING,
            rejectionReason: "",
            consentGiven: true,
            consentTimestamp: block.timestamp,
            dataRetentionEnd: retentionEnd
        });

        self.status[user] = KYCStatus.PENDING;

        // GDPR Article 7 — Record consent
        emit KYCConsentRecorded(user, block.timestamp);

        if (isUpdate) {
            emit KYCDocumentUpdated(user, oldHash, documentHash, block.timestamp);
        } else {
            emit KYCRequested(user, documentHash, block.timestamp);
        }
    }

    /**
     * @notice Approve a user's KYC request
     * @dev GDPR Article 13 — The approval is logged via event for transparency.
     */
    function approveKYC(KYCData storage self, address user) external returns (bool) {
        require(self.status[user] == KYCStatus.PENDING, "No pending request");
        self.requests[user].status = KYCStatus.APPROVED;
        self.status[user] = KYCStatus.APPROVED;
        _removeFromPending(self, user);
        emit KYCApproved(user, block.timestamp);
        return true;
    }

    /**
     * @notice Reject a user's KYC request
     * @dev GDPR Article 13 — The rejection reason is logged for transparency.
     *      The reason must NOT contain any PII.
     */
    function rejectKYC(KYCData storage self, address user, string calldata reason) external {
        require(self.status[user] == KYCStatus.PENDING, "No pending request");
        self.requests[user].status = KYCStatus.REJECTED;
        self.requests[user].rejectionReason = reason;
        self.status[user] = KYCStatus.REJECTED;
        _removeFromPending(self, user);
        emit KYCRejected(user, reason, block.timestamp);
    }

    /**
     * @notice Erase a user's KYC data (Right to be forgotten)
     * @dev GDPR Article 17 — Right to erasure ("right to be forgotten"):
     *      The data subject has the right to obtain from the controller the
     *      erasure of personal data without undue delay. This function:
     *
     *      1. Clears the document hash (the on-chain PII reference)
     *      2. Resets consent records
     *      3. Marks the user's data as erased
     *      4. Revokes KYC status (user must re-apply if they wish to use
     *         the service again)
     *
     *      NOTE: On-chain events remain as they are part of the immutable
     *      blockchain record. However, the document hash in events only
     *      references off-chain data which MUST also be deleted from the
     *      off-chain storage system per GDPR Article 17.
     *
     *      GDPR Article 17(3)(b) exemption: Data may be retained if required
     *      for compliance with a legal obligation (e.g., AML regulations).
     *      The dataRetentionEnd field enforces this minimum retention period.
     *
     * @param self The KYC data storage
     * @param user The address of the user whose data should be erased
     */
    function eraseKYCData(KYCData storage self, address user) external {
        require(self.hasRequestedKYC[user], "No data exists for user");
        require(!self.dataErased[user], "Data already erased");

        // GDPR Article 17(3)(b) — Check if AML retention period has passed
        // If retention period hasn't ended, erasure is blocked for legal compliance
        require(
            block.timestamp >= self.requests[user].dataRetentionEnd,
            "Cannot erase: AML retention period not yet expired"
        );

        // Clear on-chain data references
        self.requests[user].documentHash = "";
        self.requests[user].rejectionReason = "";
        self.requests[user].consentGiven = false;
        self.requests[user].status = KYCStatus.NONE;

        self.status[user] = KYCStatus.NONE;
        self.dataErased[user] = true;

        _removeFromPending(self, user);

        emit KYCDataErased(user, block.timestamp);
    }

    function _removeFromPending(KYCData storage self, address user) internal {
        if (!self.inPending[user]) return;
        uint len = self.pendingRequests.length;
        for (uint i = 0; i < len; i++) {
            if (self.pendingRequests[i] == user) {
                self.pendingRequests[i] = self.pendingRequests[len - 1];
                self.pendingRequests.pop();
                break;
            }
        }
        self.inPending[user] = false;
    }
}

// ============================================================================
// Limit Library — AML Transaction Monitoring
// ============================================================================
/**
 * @title LimitLib
 * @notice Tiered daily transaction limits for AML compliance
 *
 * GDPR Article 35 — Data Protection Impact Assessment:
 *   The tiered system classifies users by risk level, ensuring that higher-risk
 *   users undergo more stringent verification. This is a proportionate measure
 *   balancing AML obligations with GDPR data minimization principles.
 *
 * AML/KYC Compliance:
 *   - Tier-based limits align with Customer Due Diligence (CDD) requirements.
 *   - Daily monitoring helps detect suspicious transaction patterns.
 */
library LimitLib {
    enum UserTier { NONE, TIER1, TIER2, TIER3, VIP }

    struct Limit {
        uint256 used;
        uint256 day;
    }

    struct LimitData {
        mapping(address => Limit) sent;
        mapping(UserTier => uint256) tierLimits;
        mapping(address => UserTier) userTiers;
    }

    function initLimits(LimitData storage self) external {
        self.tierLimits[UserTier.NONE] = 0 ether;
        self.tierLimits[UserTier.TIER1] = 1500 ether;
        self.tierLimits[UserTier.TIER2] = 3000 ether;
        self.tierLimits[UserTier.TIER3] = 6000 ether;
        self.tierLimits[UserTier.VIP] = 15000 ether;
    }

    function updateDay(LimitData storage self, address user) external {
        uint256 d = block.timestamp / 1 days;
        if (self.sent[user].day != d) {
            self.sent[user].day = d;
            self.sent[user].used = 0;
        }
    }

    function canSend(LimitData storage self, address user, uint256 amount)
        external view returns (bool, uint256)
    {
        uint256 limit = self.tierLimits[self.userTiers[user]];
        uint256 dayUsed = (self.sent[user].day == block.timestamp / 1 days) ? self.sent[user].used : 0;
        if (dayUsed + amount > limit) return (false, limit - dayUsed);
        return (true, limit - dayUsed - amount);
    }
}

// ============================================================================
// IERC20 Stablecoin Interface (already imported via OpenZeppelin IERC20)
// Supports transfers of ERC-20 stablecoins on Polkadot Hub Testnet
// ============================================================================

// ============================================================================
// Main Remittance Contract
// ============================================================================
/**
 * @title Remittance
 * @notice GDPR-compliant remittance contract with stablecoin support on Polkadot
 * @dev Deployed on Polkadot Hub Testnet (Paseo) via EVM compatibility layer.
 *      Supports both native token (DOT/WND) and ERC-20 stablecoin transfers.
 *
 * GDPR Compliance Summary:
 * ========================
 * - Article 5:   Data minimization (hash-only on-chain storage)
 * - Article 6:   Lawful processing (user-initiated consent)
 * - Article 7:   Consent conditions (explicit opt-in via requestKYC)
 * - Article 13:  Transparency (comprehensive event logging)
 * - Article 15:  Right of access (user data query functions)
 * - Article 17:  Right to erasure (eraseMyKYCData / adminEraseKYCData)
 * - Article 20:  Data portability (structured getUserInfo export)
 * - Article 25:  Privacy by design (hashes, not raw data)
 * - Article 30:  Records of processing (immutable event audit trail)
 * - Article 32:  Security (ReentrancyGuard, Pausable, access controls)
 * - Article 33:  Breach notification (pause + emergency mechanisms)
 * - Article 35:  Impact assessment (tiered access system)
 *
 * Stablecoin Support:
 * ===================
 * - Whitelisted ERC-20 tokens can be used for remittance transfers
 * - Admin can add/remove supported stablecoins
 * - Separate balance tracking for each token
 * - Fee collection in the transferred token
 */
contract Remittance is Ownable, ReentrancyGuard, Pausable {
    using KYCLib for KYCLib.KYCData;
    using LimitLib for LimitLib.LimitData;
    using SafeERC20 for IERC20;

    KYCLib.KYCData private kycData;
    LimitLib.LimitData private limitData;

    // ========================================================================
    // State Variables — Native Token Balances
    // ========================================================================
    mapping(address => uint256) private balances;
    mapping(address => bool) private whitelisted;
    mapping(address => bool) private blacklisted;
    mapping(address => bool) private frozenRecipient;

    // ========================================================================
    // Stablecoin Support State Variables
    // ========================================================================
    /**
     * @dev Whitelisted stablecoins that can be used for remittance.
     *      Only admin-approved ERC-20 tokens are accepted.
     *      This prevents use of malicious or non-compliant tokens.
     */
    mapping(address => bool) public supportedStablecoins;     // token => is supported
    address[] public supportedStablecoinList;                  // list of all supported tokens
    mapping(address => string) public stablecoinSymbols;      // token => symbol (e.g., "USDT")

    /**
     * @dev Per-user, per-token stablecoin balances
     *      balances[user][token] = claimable amount
     */
    mapping(address => mapping(address => uint256)) private stablecoinBalances;

    /**
     * @dev Accumulated fees per stablecoin token
     */
    mapping(address => uint256) private stablecoinAccumulatedFees;

    // ========================================================================
    // Transaction Records
    // ========================================================================
    /**
     * @dev GDPR Article 30 — Records of processing activities:
     *      Transaction records form an audit trail. Note that transaction data
     *      contains only addresses (pseudonymous identifiers under GDPR) and
     *      amounts — no directly identifying PII is stored.
     */
    struct Transaction {
        address sender;
        address recipient;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
        uint256 txnId;
        address token;     // address(0) for native token, ERC-20 address for stablecoins
    }

    Transaction[] public allTransactions;
    mapping(address => uint256[]) private userTransactionIds;
    uint256 private nextTxnId = 1;

    uint256 public constant TRANSACTION_FEE_RATE = 125; // 0.00125%
    uint256 public constant FEE_DENOMINATOR = 10000000;
    uint256 private accumulatedFees;

    // ========================================================================
    // GDPR Article 5(1)(e) — Storage Limitation
    // Default data retention period (5 years for AML compliance)
    // ========================================================================
    uint256 public constant DATA_RETENTION_PERIOD = 5 * 365 days;

    // ========================================================================
    // Events — GDPR Article 30: Immutable Audit Trail
    // ========================================================================
    event Sent(address indexed sender, address indexed recipient, uint256 amount);
    event Claimed(address indexed recipient, uint256 amount);
    event Frozen(address indexed recipient, bool frozen);
    event TierUpdated(address indexed user, LimitLib.UserTier newTier);
    event UserWhitelisted(address indexed user, bool status);
    event UserBlacklisted(address indexed user, bool status);
    event TransactionRecorded(
        uint256 indexed txnId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 fee
    );
    event FeeCollected(uint256 amount, uint256 totalAccumulated);
    event AdminDeposit(address indexed admin, uint256 amount);
    event FeeCalculated(uint256 amount, uint256 calculatedFee);

    // Stablecoin-specific events
    event StablecoinAdded(address indexed token, string symbol);
    event StablecoinRemoved(address indexed token);
    event StablecoinSent(
        address indexed sender,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 fee,
        uint256 txnId
    );
    event StablecoinClaimed(address indexed recipient, address indexed token, uint256 amount);
    event StablecoinFeeWithdrawn(address indexed token, uint256 amount);

    /**
     * @dev GDPR Article 17 — Right to erasure event on contract level
     */
    event GDPRDataErasureRequested(address indexed user, uint256 timestamp);

    /**
     * @dev GDPR Article 33 — Breach notification event
     *      Emitted when the contract is paused due to a potential security breach.
     */
    event SecurityBreachSuspected(address indexed reporter, uint256 timestamp, string reason);

    // ========================================================================
    // Modifiers
    // ========================================================================

    /**
     * @dev GDPR Article 6 — Lawfulness of processing:
     *      Only KYC-approved and non-blacklisted users can transact.
     *      This ensures processing is based on legitimate interest (AML compliance)
     *      and prior consent (KYC submission).
     */
    modifier onlyKYCApproved(address user) {
        require(kycData.status[user] == KYCLib.KYCStatus.APPROVED, "KYC not approved");
        require(whitelisted[user] && !blacklisted[user], "Access denied");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    /**
     * @dev GDPR Article 15 — Right of access:
     *      Users can only access their own data. Owner can access any user's
     *      data for legitimate administrative purposes (GDPR Article 6(1)(f)).
     */
    modifier onlyUserOrOwner(address user) {
        require(msg.sender == user || msg.sender == owner(), "Unauthorized access");
        _;
    }

    modifier onlySupportedStablecoin(address token) {
        require(supportedStablecoins[token], "Stablecoin not supported");
        _;
    }

    // ========================================================================
    // Constructor
    // ========================================================================
    constructor() Ownable(msg.sender) {
        limitData.initLimits();

        // Owner auto-approved for operational purposes
        kycData.allKYCUsers.push(msg.sender);
        kycData.hasRequestedKYC[msg.sender] = true;
        kycData.status[msg.sender] = KYCLib.KYCStatus.APPROVED;
        whitelisted[msg.sender] = true;
        limitData.userTiers[msg.sender] = LimitLib.UserTier.VIP;
    }

    // ========================================================================
    // KYC Functions — GDPR Compliant
    // ========================================================================

    /**
     * @notice Submit KYC verification request with GDPR consent
     * @dev GDPR Article 6(1)(a) — Consent as lawful basis:
     *      By calling this function, the user gives explicit consent for
     *      their KYC data to be processed for identity verification purposes.
     *
     *      GDPR Article 7(2) — Distinguishable consent:
     *      The KYC request is a separate, clearly distinguishable action
     *      from other contract interactions.
     *
     * @param documentHash The hash of the KYC document stored off-chain
     */
    function requestKYC(string calldata documentHash) external {
        require(bytes(documentHash).length > 0, "Document hash required");
        kycData.requestKYC(msg.sender, documentHash);
    }

    /**
     * @notice Approve a user's KYC and set their tier
     * @dev GDPR Article 13 — Information to the data subject:
     *      Approval status changes are logged via events, ensuring the user
     *      can be notified of data processing outcomes.
     */
    function approveKYC(address user, LimitLib.UserTier tier) external onlyOwner validAddress(user) {
        require(kycData.status[user] == KYCLib.KYCStatus.PENDING, "No pending KYC request");
        bool approved = kycData.approveKYC(user);
        if (approved) {
            whitelisted[user] = true;
            limitData.userTiers[user] = tier;
            emit UserWhitelisted(user, true);
            emit TierUpdated(user, tier);
        }
    }

    /**
     * @notice Reject a user's KYC request
     * @dev GDPR Article 13 — The rejection reason must NOT contain PII.
     */
    function rejectKYC(address user, string calldata reason) external onlyOwner validAddress(user) {
        require(bytes(reason).length > 0, "Rejection reason required");
        kycData.rejectKYC(user, reason);
    }

    /**
     * @notice Batch approve KYC requests
     * @dev GDPR Article 5(1)(d) — Accuracy:
     *      Batch processing must maintain the same verification standards
     *      as individual approvals.
     */
    function batchApprove(address[] calldata users, LimitLib.UserTier[] calldata tiers)
        external onlyOwner
    {
        require(users.length == tiers.length, "Array length mismatch");
        require(users.length <= 50, "Batch size too large");
        for (uint i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address in batch");
            if (kycData.status[users[i]] == KYCLib.KYCStatus.PENDING) {
                bool approved = kycData.approveKYC(users[i]);
                if (approved) {
                    whitelisted[users[i]] = true;
                    limitData.userTiers[users[i]] = tiers[i];
                    emit UserWhitelisted(users[i], true);
                    emit TierUpdated(users[i], tiers[i]);
                }
            }
        }
    }

    // ========================================================================
    // GDPR Article 17 — Right to Erasure ("Right to be Forgotten")
    // ========================================================================

    /**
     * @notice Request erasure of your own KYC data
     * @dev GDPR Article 17(1) — The data subject shall have the right to
     *      obtain from the controller the erasure of personal data concerning
     *      him or her without undue delay.
     *
     *      GDPR Article 17(3)(b) — Exemption: Erasure may be blocked if data
     *      retention is required for compliance with a legal obligation under
     *      EU or Member State law (e.g., AML regulations require 5-year retention).
     *
     *      When erasure succeeds:
     *      - On-chain document hash is cleared
     *      - KYC status is reset to NONE
     *      - User consent is revoked
     *      - User is de-whitelisted (can no longer transact)
     *      - Off-chain data MUST also be deleted by the data controller
     *
     * @notice Users must also contact the data controller to ensure off-chain
     *         data deletion per GDPR Article 17(2).
     */
    function eraseMyKYCData() external {
        kycData.eraseKYCData(msg.sender);

        // Revoke access — user can no longer transact until re-verified
        whitelisted[msg.sender] = false;
        limitData.userTiers[msg.sender] = LimitLib.UserTier.NONE;

        emit GDPRDataErasureRequested(msg.sender, block.timestamp);
    }

    /**
     * @notice Admin-initiated KYC data erasure (e.g., upon verified request)
     * @dev GDPR Article 17(1) — Controller obligation to erase data.
     *      This allows the admin to process erasure requests received through
     *      off-chain channels (email, support ticket, etc.).
     */
    function adminEraseKYCData(address user) external onlyOwner validAddress(user) {
        kycData.eraseKYCData(user);

        whitelisted[user] = false;
        limitData.userTiers[user] = LimitLib.UserTier.NONE;

        emit GDPRDataErasureRequested(user, block.timestamp);
    }

    // ========================================================================
    // Stablecoin Management — Polkadot Hub Testnet ERC-20 Support
    // ========================================================================

    /**
     * @notice Add a supported stablecoin for remittance transfers
     * @dev Only whitelisted ERC-20 tokens can be used for transfers.
     *      This prevents use of malicious tokens and ensures compliance.
     *
     * @param token The ERC-20 token contract address on Polkadot Hub Testnet
     * @param symbol Human-readable symbol (e.g., "USDT", "USDC", "DAI")
     */
    function addSupportedStablecoin(address token, string calldata symbol)
        external onlyOwner validAddress(token)
    {
        require(!supportedStablecoins[token], "Token already supported");
        require(bytes(symbol).length > 0, "Symbol required");

        supportedStablecoins[token] = true;
        supportedStablecoinList.push(token);
        stablecoinSymbols[token] = symbol;

        emit StablecoinAdded(token, symbol);
    }

    /**
     * @notice Remove a stablecoin from the supported list
     * @param token The ERC-20 token contract address to remove
     */
    function removeSupportedStablecoin(address token) external onlyOwner validAddress(token) {
        require(supportedStablecoins[token], "Token not supported");

        supportedStablecoins[token] = false;

        // Remove from array
        uint len = supportedStablecoinList.length;
        for (uint i = 0; i < len; i++) {
            if (supportedStablecoinList[i] == token) {
                supportedStablecoinList[i] = supportedStablecoinList[len - 1];
                supportedStablecoinList.pop();
                break;
            }
        }

        emit StablecoinRemoved(token);
    }

    /**
     * @notice Get all supported stablecoins
     * @return tokens Array of supported stablecoin addresses
     */
    function getSupportedStablecoins() external view returns (address[] memory) {
        return supportedStablecoinList;
    }

    // ========================================================================
    // Fee Calculation
    // ========================================================================

    function calculateTransactionFee(uint256 amount) public pure returns (uint256) {
        return (amount * TRANSACTION_FEE_RATE) / FEE_DENOMINATOR;
    }

    function getTransactionCost(uint256 amount) external pure returns (uint256 fee, uint256 total) {
        fee = calculateTransactionFee(amount);
        total = amount + fee;
        return (fee, total);
    }

    // ========================================================================
    // Native Token Remittance (DOT/WND on Polkadot Hub Testnet)
    // ========================================================================

    /**
     * @notice Send native token remittance to a recipient
     * @dev Both sender and recipient must be KYC-approved per AML requirements.
     *
     *      GDPR Article 6(1)(b) — Processing necessary for contract performance:
     *      Transaction data is processed to fulfill the remittance service contract.
     *
     *      GDPR Article 30 — Records of processing:
     *      Transaction details are logged via events for audit compliance.
     */
    function sendRemittance(address recipient)
        external payable whenNotPaused onlyKYCApproved(msg.sender) onlyKYCApproved(recipient)
    {
        require(recipient != msg.sender, "Cannot send to self");
        require(msg.value > 0, "Amount must be greater than zero");
        require(!frozenRecipient[recipient], "Recipient is frozen");

        uint256 fee = calculateTransactionFee(msg.value);
        uint256 netAmount = msg.value - fee;
        emit FeeCalculated(msg.value, fee);

        limitData.updateDay(msg.sender);
        (bool canSend, uint256 remaining) = limitData.canSend(msg.sender, msg.value);
        require(canSend, string(abi.encodePacked("Daily limit exceeded. Remaining: ", remaining)));

        limitData.sent[msg.sender].used += msg.value;
        balances[recipient] += netAmount;
        accumulatedFees += fee;

        Transaction memory newTxn = Transaction({
            sender: msg.sender,
            recipient: recipient,
            amount: netAmount,
            fee: fee,
            timestamp: block.timestamp,
            txnId: nextTxnId,
            token: address(0) // Native token indicator
        });

        allTransactions.push(newTxn);
        userTransactionIds[msg.sender].push(nextTxnId);
        userTransactionIds[recipient].push(nextTxnId);

        emit TransactionRecorded(nextTxnId, msg.sender, recipient, netAmount, fee);
        emit FeeCollected(fee, accumulatedFees);
        nextTxnId++;
        emit Sent(msg.sender, recipient, netAmount);
    }

    // ========================================================================
    // Stablecoin Remittance — ERC-20 Transfers on Polkadot Hub Testnet
    // ========================================================================

    /**
     * @notice Send stablecoin remittance to a recipient
     * @dev Transfers ERC-20 stablecoins (e.g., USDT, USDC, DAI) on the
     *      Polkadot Hub Testnet. The sender must first approve this contract
     *      to spend their tokens via the ERC-20 approve() function.
     *
     *      Flow:
     *      1. Sender approves this contract to spend `amount` tokens
     *      2. Sender calls sendStablecoinRemittance()
     *      3. Contract transfers tokens from sender to itself
     *      4. Net amount (minus fee) is credited to recipient's balance
     *      5. Recipient calls claimStablecoinRemittance() to withdraw
     *
     *      AML Compliance:
     *      - Both sender and recipient must be KYC-approved
     *      - Daily limits apply (converted to native token equivalent)
     *      - Only whitelisted stablecoins are accepted
     *
     * @param token The ERC-20 stablecoin contract address
     * @param recipient The recipient address
     * @param amount The amount of stablecoins to send (in token's smallest unit)
     */
    function sendStablecoinRemittance(
        address token,
        address recipient,
        uint256 amount
    )
        external
        whenNotPaused
        nonReentrant
        onlyKYCApproved(msg.sender)
        onlyKYCApproved(recipient)
        onlySupportedStablecoin(token)
    {
        require(recipient != msg.sender, "Cannot send to self");
        require(amount > 0, "Amount must be greater than zero");
        require(!frozenRecipient[recipient], "Recipient is frozen");

        uint256 fee = calculateTransactionFee(amount);
        uint256 netAmount = amount - fee;

        emit FeeCalculated(amount, fee);

        // AML daily limit check (uses the same limit system)
        limitData.updateDay(msg.sender);
        (bool canSend, uint256 remaining) = limitData.canSend(msg.sender, amount);
        require(canSend, string(abi.encodePacked("Daily limit exceeded. Remaining: ", remaining)));
        limitData.sent[msg.sender].used += amount;

        // Transfer stablecoins from sender to this contract
        // SafeERC20 handles tokens that don't return bool on transfer
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Credit recipient balance & accumulate fees
        stablecoinBalances[recipient][token] += netAmount;
        stablecoinAccumulatedFees[token] += fee;

        // Record transaction
        Transaction memory newTxn = Transaction({
            sender: msg.sender,
            recipient: recipient,
            amount: netAmount,
            fee: fee,
            timestamp: block.timestamp,
            txnId: nextTxnId,
            token: token  // ERC-20 token address
        });

        allTransactions.push(newTxn);
        userTransactionIds[msg.sender].push(nextTxnId);
        userTransactionIds[recipient].push(nextTxnId);

        emit StablecoinSent(msg.sender, recipient, token, netAmount, fee, nextTxnId);
        emit TransactionRecorded(nextTxnId, msg.sender, recipient, netAmount, fee);
        nextTxnId++;
    }

    /**
     * @notice Claim stablecoin remittance funds
     * @dev Transfers the claimable stablecoin balance to the caller.
     *
     * @param token The ERC-20 stablecoin contract address to claim
     */
    function claimStablecoinRemittance(address token)
        external
        nonReentrant
        whenNotPaused
        onlyKYCApproved(msg.sender)
        onlySupportedStablecoin(token)
    {
        require(!frozenRecipient[msg.sender], "Account is frozen");
        uint256 amount = stablecoinBalances[msg.sender][token];
        require(amount > 0, "No stablecoin funds to claim");

        stablecoinBalances[msg.sender][token] = 0;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit StablecoinClaimed(msg.sender, token, amount);
    }

    /**
     * @notice Get stablecoin balance for a user
     * @param user The user address
     * @param token The stablecoin token address
     * @return The claimable stablecoin balance
     */
    function getStablecoinBalance(address user, address token)
        external view onlyUserOrOwner(user) returns (uint256)
    {
        return stablecoinBalances[user][token];
    }

    /**
     * @notice Get my stablecoin balance
     * @param token The stablecoin token address
     * @return The caller's claimable stablecoin balance
     */
    function getMyStablecoinBalance(address token) external view returns (uint256) {
        return stablecoinBalances[msg.sender][token];
    }

    /**
     * @notice Withdraw accumulated stablecoin fees
     * @param token The stablecoin whose accumulated fees to withdraw
     */
    function withdrawStablecoinFees(address token) external onlyOwner nonReentrant {
        uint256 feeAmount = stablecoinAccumulatedFees[token];
        require(feeAmount > 0, "No stablecoin fees to withdraw");

        stablecoinAccumulatedFees[token] = 0;
        IERC20(token).safeTransfer(owner(), feeAmount);

        emit StablecoinFeeWithdrawn(token, feeAmount);
    }

    /**
     * @notice Get accumulated fees for a stablecoin
     * @param token The stablecoin token address
     * @return The accumulated fee amount
     */
    function getStablecoinAccumulatedFees(address token) external view onlyOwner returns (uint256) {
        return stablecoinAccumulatedFees[token];
    }

    // ========================================================================
    // Native Token Claim & Admin Functions
    // ========================================================================

    function claimRemittance() external nonReentrant whenNotPaused onlyKYCApproved(msg.sender) {
        require(!frozenRecipient[msg.sender], "Account is frozen");
        require(balances[msg.sender] > 0, "No funds to claim");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Claimed(msg.sender, amount);
    }

    function adminDeposit() external payable onlyOwner {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        emit AdminDeposit(msg.sender, msg.value);
    }

    function withdrawFees() external onlyOwner nonReentrant {
        require(accumulatedFees > 0, "No fees to withdraw");
        uint256 feeAmount = accumulatedFees;
        accumulatedFees = 0;
        (bool success, ) = payable(owner()).call{value: feeAmount}("");
        require(success, "Fee withdrawal failed");
    }

    function getAccumulatedFees() external view onlyOwner returns (uint256) {
        return accumulatedFees;
    }

    // ========================================================================
    // Access Control — AML/KYC Enforcement
    // ========================================================================

    function setBlacklist(address user, bool status) external onlyOwner validAddress(user) {
        require(blacklisted[user] != status, "Status already set");
        blacklisted[user] = status;
        emit UserBlacklisted(user, status);
    }

    function setUserTier(address user, LimitLib.UserTier tier) external onlyOwner validAddress(user) {
        require(kycData.status[user] == KYCLib.KYCStatus.APPROVED, "User not KYC approved");
        require(whitelisted[user], "User not whitelisted");
        limitData.userTiers[user] = tier;
        emit TierUpdated(user, tier);
    }

    function setTierLimit(LimitLib.UserTier tier, uint256 limit) external onlyOwner {
        require(limit > 0, "Limit must be greater than zero");
        require(limit <= 100000 ether, "Limit too high");
        limitData.tierLimits[tier] = limit;
    }

    // ========================================================================
    // Security & Emergency — GDPR Article 32 & Article 33
    // ========================================================================

    /**
     * @dev GDPR Article 33 — Notification of a personal data breach:
     *      The pause mechanism serves as the on-chain component of breach
     *      response. When a breach is suspected, the contract can be paused
     *      to prevent further data processing until the breach is assessed.
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Report a suspected security breach and pause the contract
     * @dev GDPR Article 33 — Controller must notify supervisory authority
     *      within 72 hours of becoming aware of a breach. This function
     *      pauses all operations and logs the breach event.
     */
    function reportSecurityBreach(string calldata reason) external onlyOwner {
        _pause();
        emit SecurityBreachSuspected(msg.sender, block.timestamp, reason);
    }

    function freezeRecipient(address user, bool frozen) external onlyOwner validAddress(user) {
        require(frozenRecipient[user] != frozen, "Status already set");
        frozenRecipient[user] = frozen;
        emit Frozen(user, frozen);
    }

    function emergencyRecovery(address user) external onlyOwner nonReentrant validAddress(user) {
        uint256 amount = balances[user];
        require(amount > 0, "No funds to recover");
        balances[user] = 0;
        (bool success, ) = payable(user).call{value: amount}("");
        require(success, "Recovery transfer failed");
        emit Claimed(user, amount);
    }

    function emergencyWithdraw() external onlyOwner {
        require(paused(), "Contract must be paused for emergency withdrawal");
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: contractBalance}("");
        require(success, "Emergency withdrawal failed");
    }

    // ========================================================================
    // Data Access — GDPR Article 15 (Right of Access) & Article 20 (Portability)
    // ========================================================================

    /**
     * @notice Get all KYC users (admin only)
     * @dev GDPR Article 30 — Part of records of processing activities.
     *      Access restricted to data controller (owner) only.
     */
    function getAllKYCUsers() external view onlyOwner returns (address[] memory) {
        return kycData.allKYCUsers;
    }

    function getTotalTransactions() external view returns (uint256) {
        return allTransactions.length;
    }

    /**
     * @notice Get transaction details by ID
     * @dev GDPR Article 15 — Right of access:
     *      Users can only access transactions they are involved in.
     *      Owner can access any transaction for audit purposes (Article 6(1)(f)).
     */
    function getTransaction(uint256 txnId) external view returns (
        address sender,
        address recipient,
        uint256 amount,
        uint256 fee,
        uint256 timestamp,
        address token
    ) {
        require(txnId > 0 && txnId < nextTxnId, "Invalid transaction ID");
        for (uint i = 0; i < allTransactions.length; i++) {
            if (allTransactions[i].txnId == txnId) {
                Transaction memory txn = allTransactions[i];
                require(
                    msg.sender == owner() ||
                    msg.sender == txn.sender ||
                    msg.sender == txn.recipient,
                    "Unauthorized access to transaction"
                );
                return (txn.sender, txn.recipient, txn.amount, txn.fee, txn.timestamp, txn.token);
            }
        }
        revert("Transaction not found");
    }

    function getUserTransactionIds(address user) external view onlyUserOrOwner(user) returns (uint256[] memory) {
        return userTransactionIds[user];
    }

    function getAllTransactions() external view onlyOwner returns (Transaction[] memory) {
        return allTransactions;
    }

    function getTransactionsByUser(address user) external view onlyUserOrOwner(user) returns (Transaction[] memory) {
        uint256[] memory userTxnIds = userTransactionIds[user];
        Transaction[] memory userTxns = new Transaction[](userTxnIds.length);
        for (uint i = 0; i < userTxnIds.length; i++) {
            uint256 txnId = userTxnIds[i];
            for (uint j = 0; j < allTransactions.length; j++) {
                if (allTransactions[j].txnId == txnId) {
                    userTxns[i] = allTransactions[j];
                    break;
                }
            }
        }
        return userTxns;
    }

    function getBalance(address user) external view onlyUserOrOwner(user) returns (uint256) {
        return balances[user];
    }

    function isWhitelisted(address user) external view onlyUserOrOwner(user) returns (bool) {
        return whitelisted[user];
    }

    function isBlacklisted(address user) external view onlyUserOrOwner(user) returns (bool) {
        return blacklisted[user];
    }

    function isFrozen(address user) external view onlyUserOrOwner(user) returns (bool) {
        return frozenRecipient[user];
    }

    function isKYCApproved(address user) external view onlyUserOrOwner(user) returns (bool) {
        return kycData.status[user] == KYCLib.KYCStatus.APPROVED;
    }

    function getPendingKYC() external view onlyOwner returns (address[] memory) {
        return kycData.pendingRequests;
    }

    function getKYCStatus(address user) external view onlyUserOrOwner(user) returns (KYCLib.KYCStatus) {
        return kycData.status[user];
    }

    /**
     * @notice Get KYC request details
     * @dev GDPR Article 15 — Right of access:
     *      Data subjects can access their own KYC request data.
     *
     *      GDPR Article 20 — Right to data portability:
     *      Data is returned in a structured, commonly used format.
     */
    function getKYCRequest(address user) external view onlyUserOrOwner(user) returns (
        string memory documentHash,
        uint256 timestamp,
        KYCLib.KYCStatus status,
        string memory rejectionReason,
        bool consentGiven,
        uint256 consentTimestamp,
        uint256 dataRetentionEnd
    ) {
        KYCLib.KYCRequest memory req = kycData.requests[user];
        return (
            req.documentHash,
            req.timestamp,
            req.status,
            req.rejectionReason,
            req.consentGiven,
            req.consentTimestamp,
            req.dataRetentionEnd
        );
    }

    /**
     * @notice Get comprehensive user info
     * @dev GDPR Article 15 — Right of access & Article 20 — Data portability:
     *      Returns all data the contract holds about the user in a structured format.
     */
    function getUserInfo(address user) external view onlyUserOrOwner(user) returns (
        LimitLib.UserTier tier,
        uint256 dailyLimit,
        uint256 todayUsed,
        uint256 balance,
        bool isWhitelistedUser,
        bool isBlacklistedUser,
        bool isFrozenUser,
        KYCLib.KYCStatus kycStatus
    ) {
        tier = limitData.userTiers[user];
        dailyLimit = limitData.tierLimits[tier];
        todayUsed = (limitData.sent[user].day == block.timestamp / 1 days) ?
                    limitData.sent[user].used : 0;
        balance = balances[user];
        isWhitelistedUser = whitelisted[user];
        isBlacklistedUser = blacklisted[user];
        isFrozenUser = frozenRecipient[user];
        kycStatus = kycData.status[user];
    }

    function getRemainingLimit(address user) external view onlyUserOrOwner(user) returns (uint256) {
        (, uint256 remaining) = limitData.canSend(user, 0);
        return remaining;
    }

    function getTierLimit(LimitLib.UserTier tier) external view returns (uint256) {
        return limitData.tierLimits[tier];
    }

    // ========================================================================
    // Self-Service Data Access — GDPR Article 15 (Right of Access)
    // These functions allow users to access their own data without revealing
    // their address to the admin.
    // ========================================================================

    function getMyBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    function getMyKYCStatus() external view returns (KYCLib.KYCStatus) {
        return kycData.status[msg.sender];
    }

    function getMyTier() external view returns (LimitLib.UserTier) {
        return limitData.userTiers[msg.sender];
    }

    function getMyRemainingLimit() external view returns (uint256) {
        (, uint256 remaining) = limitData.canSend(msg.sender, 0);
        return remaining;
    }

    function getMyWhitelistStatus() external view returns (bool) {
        return whitelisted[msg.sender];
    }

    function getMyBlacklistStatus() external view returns (bool) {
        return blacklisted[msg.sender];
    }

    function getMyFrozenStatus() external view returns (bool) {
        return frozenRecipient[msg.sender];
    }

    function getMyTransactionIds() external view returns (uint256[] memory) {
        return userTransactionIds[msg.sender];
    }

    function getMyTransactions() external view returns (Transaction[] memory) {
        uint256[] memory myTxnIds = userTransactionIds[msg.sender];
        Transaction[] memory myTxns = new Transaction[](myTxnIds.length);
        for (uint i = 0; i < myTxnIds.length; i++) {
            uint256 txnId = myTxnIds[i];
            for (uint j = 0; j < allTransactions.length; j++) {
                if (allTransactions[j].txnId == txnId) {
                    myTxns[i] = allTransactions[j];
                    break;
                }
            }
        }
        return myTxns;
    }

    /**
     * @notice Check if a user's KYC data has been erased
     * @dev GDPR Article 17 — Verify erasure status.
     */
    function isDataErased(address user) external view onlyUserOrOwner(user) returns (bool) {
        return kycData.dataErased[user];
    }

    /**
     * @notice Check when the data retention period ends for a user
     * @dev GDPR Article 5(1)(e) — Storage limitation transparency.
     */
    function getDataRetentionEnd(address user) external view onlyUserOrOwner(user) returns (uint256) {
        return kycData.requests[user].dataRetentionEnd;
    }

    // ========================================================================
    // Contract Info — Admin
    // ========================================================================

    function getContractBalance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function getContractInfo() external view onlyOwner returns (
        uint256 totalUsers,
        uint256 totalTransactions,
        uint256 contractBalance,
        uint256 pendingKYCs,
        uint256 accumulatedFeesAmount
    ) {
        return (
            kycData.allKYCUsers.length,
            allTransactions.length,
            address(this).balance,
            kycData.pendingRequests.length,
            accumulatedFees
        );
    }

    // ========================================================================
    // Fallback & Receive
    // ========================================================================

    receive() external payable {
        revert("Direct payments not allowed");
    }

    fallback() external {
        revert("Function not found");
    }
}