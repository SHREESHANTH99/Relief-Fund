// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReliefFund
 * @dev Relief Currency System with Token Controls
 * @notice Stable Relief Token with User Caps, Expiry, and Category Restrictions
 */
contract ReliefFund {
    // ============= ENUMS =============

    enum Role {
        None,
        Admin,
        Donor,
        Beneficiary,
        Merchant
    }

    enum MerchantCategory {
        None,
        Food,
        Medicine,
        Emergency
    }

    // ============= STRUCTS =============

    struct User {
        Role role;
        bool isActive;
        uint256 registeredAt;
    }

    struct BeneficiaryAccount {
        uint256 allocatedTokens; // Total tokens allocated
        uint256 spentTokens; // Total tokens spent
        uint256 maxAllocation; // Max tokens this user can receive
        uint256 dailySpendLimit; // Max tokens per day
        uint256 weeklySpendLimit; // Max tokens per week
        uint256 lastSpendDate; // Last spending timestamp
        uint256 dailySpent; // Tokens spent today
        uint256 weeklySpent; // Tokens spent this week
        uint256 weekStartDate; // Week start timestamp
        uint256 expiryDate; // When unspent tokens expire
    }

    struct MerchantProfile {
        MerchantCategory category;
        string businessName;
        bool verified;
        uint256 totalReceived;
    }

    struct TokenAllocation {
        address beneficiary;
        uint256 amount;
        uint256 allocatedAt;
        uint256 expiryDate;
        bool expired;
    }

    // ============= STATE VARIABLES =============

    address public owner;
    bool public paused;

    // Token System
    string public constant TOKEN_NAME = "Relief Unit";
    string public constant TOKEN_SYMBOL = "RELIEF";
    uint256 public constant TOKEN_UNIT = 1e18; // 1 token = 1 unit (1 meal equivalent)
    uint256 public totalTokensMinted;
    uint256 public totalTokensExpired;

    // Default Limits (can be overridden per user)
    uint256 public defaultMaxAllocation = 1000 * TOKEN_UNIT; // 1000 tokens
    uint256 public defaultDailyLimit = 50 * TOKEN_UNIT; // 50 tokens/day
    uint256 public defaultWeeklyLimit = 300 * TOKEN_UNIT; // 300 tokens/week
    uint256 public defaultExpiryDuration = 30 days; // 30 days

    // Mappings
    mapping(address => User) public users;
    mapping(address => BeneficiaryAccount) public beneficiaries;
    mapping(address => MerchantProfile) public merchants;
    mapping(Role => uint256) public roleCount;
    mapping(uint256 => TokenAllocation) public allocations;
    uint256 public allocationCount;

    // Donations (ETH)
    uint256 public totalDonations;

    // Phase-2: PIN Authentication & Relayer
    mapping(address => bytes32) public pinHashes; // User -> Hashed PIN
    mapping(address => bool) public hasPIN; // User has set PIN
    mapping(address => address) public relayers; // User -> Authorized Relayer
    mapping(address => bool) public trustedRelayers; // Backend relayers
    mapping(address => uint256) public nonces; // For replay protection

    // ============= EVENTS =============

    event PINSet(address indexed user, uint256 timestamp);
    event PINReset(address indexed user, uint256 timestamp);
    event RelayerAuthorized(
        address indexed user,
        address indexed relayer,
        uint256 timestamp
    );
    event RelayedTransaction(
        address indexed user,
        address indexed relayer,
        string action,
        uint256 timestamp
    );

    event RoleAssigned(address indexed user, Role role, uint256 timestamp);
    event RoleRevoked(address indexed user, Role oldRole, uint256 timestamp);

    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    event TokensAllocated(
        address indexed beneficiary,
        uint256 amount,
        uint256 expiryDate,
        uint256 timestamp
    );

    event TokensSpent(
        address indexed beneficiary,
        address indexed merchant,
        MerchantCategory category,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    event TokensExpired(
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );

    event MerchantRegistered(
        address indexed merchant,
        MerchantCategory category,
        string businessName,
        uint256 timestamp
    );

    event LimitsUpdated(
        address indexed beneficiary,
        uint256 maxAllocation,
        uint256 dailyLimit,
        uint256 weeklyLimit
    );

    event EmergencyPause(address indexed by, uint256 timestamp);
    event EmergencyUnpause(address indexed by, uint256 timestamp);

    // ============= MODIFIERS =============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(
            users[msg.sender].role == Role.Admin || msg.sender == owner,
            "Only admin"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    modifier onlyRole(Role _role) {
        require(users[msg.sender].role == _role, "Unauthorized role");
        require(users[msg.sender].isActive, "User not active");
        _;
    }

    // ============= CONSTRUCTOR =============

    constructor() {
        owner = msg.sender;
        paused = false;

        users[msg.sender] = User({
            role: Role.Admin,
            isActive: true,
            registeredAt: block.timestamp
        });
        roleCount[Role.Admin] = 1;

        emit RoleAssigned(msg.sender, Role.Admin, block.timestamp);
    }

    // ============= ROLE MANAGEMENT =============

    function assignRole(
        address _user,
        Role _role
    ) external onlyAdmin whenNotPaused {
        require(_user != address(0), "Invalid address");
        require(_role != Role.None, "Cannot assign None role");
        require(users[_user].role == Role.None, "User already has role");

        users[_user] = User({
            role: _role,
            isActive: true,
            registeredAt: block.timestamp
        });

        roleCount[_role]++;

        // Initialize beneficiary account
        if (_role == Role.Beneficiary) {
            beneficiaries[_user] = BeneficiaryAccount({
                allocatedTokens: 0,
                spentTokens: 0,
                maxAllocation: defaultMaxAllocation,
                dailySpendLimit: defaultDailyLimit,
                weeklySpendLimit: defaultWeeklyLimit,
                lastSpendDate: 0,
                dailySpent: 0,
                weeklySpent: 0,
                weekStartDate: block.timestamp,
                expiryDate: 0
            });
        }

        emit RoleAssigned(_user, _role, block.timestamp);
    }

    function revokeRole(address _user) external onlyAdmin whenNotPaused {
        require(_user != owner, "Cannot revoke owner");
        require(users[_user].role != Role.None, "No role to revoke");

        Role oldRole = users[_user].role;
        users[_user].role = Role.None;
        users[_user].isActive = false;

        roleCount[oldRole]--;

        emit RoleRevoked(_user, oldRole, block.timestamp);
    }

    function toggleUserStatus(address _user) external onlyAdmin whenNotPaused {
        require(_user != owner, "Cannot toggle owner");
        require(users[_user].role != Role.None, "No role assigned");

        users[_user].isActive = !users[_user].isActive;
    }

    // ============= MERCHANT MANAGEMENT =============

    function registerMerchant(
        address _merchant,
        MerchantCategory _category,
        string calldata _businessName
    ) external onlyAdmin whenNotPaused {
        require(_merchant != address(0), "Invalid merchant");
        require(_category != MerchantCategory.None, "Invalid category");
        require(users[_merchant].role == Role.Merchant, "Not a merchant");

        merchants[_merchant] = MerchantProfile({
            category: _category,
            businessName: _businessName,
            verified: true,
            totalReceived: 0
        });

        emit MerchantRegistered(
            _merchant,
            _category,
            _businessName,
            block.timestamp
        );
    }

    // ============= TOKEN ALLOCATION =============

    function allocateTokens(
        address _beneficiary,
        uint256 _amount,
        uint256 _expiryDuration
    ) external onlyAdmin whenNotPaused {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_amount > 0, "Amount must be > 0");
        require(
            users[_beneficiary].role == Role.Beneficiary,
            "Not a beneficiary"
        );
        require(users[_beneficiary].isActive, "Beneficiary not active");

        BeneficiaryAccount storage account = beneficiaries[_beneficiary];

        // Check max allocation
        require(
            account.allocatedTokens - account.spentTokens + _amount <=
                account.maxAllocation,
            "Exceeds max allocation"
        );

        // Set expiry
        uint256 expiry = block.timestamp +
            (_expiryDuration > 0 ? _expiryDuration : defaultExpiryDuration);

        account.allocatedTokens += _amount;
        account.expiryDate = expiry;
        totalTokensMinted += _amount;

        // Record allocation
        allocations[allocationCount] = TokenAllocation({
            beneficiary: _beneficiary,
            amount: _amount,
            allocatedAt: block.timestamp,
            expiryDate: expiry,
            expired: false
        });
        allocationCount++;

        emit TokensAllocated(_beneficiary, _amount, expiry, block.timestamp);
    }

    function setUserLimits(
        address _beneficiary,
        uint256 _maxAllocation,
        uint256 _dailyLimit,
        uint256 _weeklyLimit
    ) external onlyAdmin whenNotPaused {
        require(
            users[_beneficiary].role == Role.Beneficiary,
            "Not a beneficiary"
        );

        BeneficiaryAccount storage account = beneficiaries[_beneficiary];
        account.maxAllocation = _maxAllocation;
        account.dailySpendLimit = _dailyLimit;
        account.weeklySpendLimit = _weeklyLimit;

        emit LimitsUpdated(
            _beneficiary,
            _maxAllocation,
            _dailyLimit,
            _weeklyLimit
        );
    }

    // ============= TOKEN SPENDING =============

    function spendTokens(
        address _merchant,
        uint256 _amount,
        string calldata _description
    ) external onlyRole(Role.Beneficiary) whenNotPaused {
        require(_merchant != address(0), "Invalid merchant");
        require(_amount > 0, "Amount must be > 0");
        require(users[_merchant].role == Role.Merchant, "Not a merchant");
        require(users[_merchant].isActive, "Merchant not active");
        require(merchants[_merchant].verified, "Merchant not verified");

        BeneficiaryAccount storage account = beneficiaries[msg.sender];

        // Check available balance
        uint256 available = account.allocatedTokens - account.spentTokens;
        require(available >= _amount, "Insufficient tokens");

        // Check expiry
        require(block.timestamp < account.expiryDate, "Tokens expired");

        // Reset daily counter if new day
        if (block.timestamp >= account.lastSpendDate + 1 days) {
            account.dailySpent = 0;
            account.lastSpendDate = block.timestamp;
        }

        // Reset weekly counter if new week
        if (block.timestamp >= account.weekStartDate + 7 days) {
            account.weeklySpent = 0;
            account.weekStartDate = block.timestamp;
        }

        // Check daily limit
        require(
            account.dailySpent + _amount <= account.dailySpendLimit,
            "Daily limit exceeded"
        );

        // Check weekly limit
        require(
            account.weeklySpent + _amount <= account.weeklySpendLimit,
            "Weekly limit exceeded"
        );

        // Execute spending
        account.spentTokens += _amount;
        account.dailySpent += _amount;
        account.weeklySpent += _amount;

        merchants[_merchant].totalReceived += _amount;

        emit TokensSpent(
            msg.sender,
            _merchant,
            merchants[_merchant].category,
            _amount,
            _description,
            block.timestamp
        );
    }

    // ============= TOKEN EXPIRY =============

    function expireTokens(address _beneficiary) external whenNotPaused {
        require(
            users[_beneficiary].role == Role.Beneficiary,
            "Not a beneficiary"
        );

        BeneficiaryAccount storage account = beneficiaries[_beneficiary];

        require(
            block.timestamp >= account.expiryDate,
            "Tokens not expired yet"
        );

        uint256 unspent = account.allocatedTokens - account.spentTokens;

        if (unspent > 0) {
            totalTokensExpired += unspent;
            account.allocatedTokens = account.spentTokens; // Mark as expired

            emit TokensExpired(_beneficiary, unspent, block.timestamp);
        }
    }

    function batchExpireTokens(
        address[] calldata _beneficiaries
    ) external onlyAdmin whenNotPaused {
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            address beneficiary = _beneficiaries[i];

            if (users[beneficiary].role != Role.Beneficiary) continue;

            BeneficiaryAccount storage account = beneficiaries[beneficiary];

            if (block.timestamp >= account.expiryDate) {
                uint256 unspent = account.allocatedTokens - account.spentTokens;

                if (unspent > 0) {
                    totalTokensExpired += unspent;
                    account.allocatedTokens = account.spentTokens;

                    emit TokensExpired(beneficiary, unspent, block.timestamp);
                }
            }
        }
    }

    // ============= DONATION FUNCTIONS =============

    function donate() external payable whenNotPaused {
        require(msg.value > 0, "Donation must be > 0");

        totalDonations += msg.value;

        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }

    // ============= EMERGENCY FUNCTIONS =============

    function pause() external onlyAdmin whenNotPaused {
        paused = true;
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function unpause() external onlyAdmin {
        require(paused, "Not paused");
        paused = false;
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    // ============= VIEW FUNCTIONS =============

    function getUserInfo(
        address _user
    ) external view returns (Role role, bool isActive, uint256 registeredAt) {
        User memory user = users[_user];
        return (user.role, user.isActive, user.registeredAt);
    }

    function getBeneficiaryAccount(
        address _beneficiary
    )
        external
        view
        returns (
            uint256 allocatedTokens,
            uint256 spentTokens,
            uint256 availableTokens,
            uint256 maxAllocation,
            uint256 dailySpendLimit,
            uint256 weeklySpendLimit,
            uint256 dailySpent,
            uint256 weeklySpent,
            uint256 expiryDate,
            bool isExpired
        )
    {
        BeneficiaryAccount memory account = beneficiaries[_beneficiary];
        uint256 available = account.allocatedTokens - account.spentTokens;
        bool expired = block.timestamp >= account.expiryDate &&
            account.expiryDate > 0;

        return (
            account.allocatedTokens,
            account.spentTokens,
            available,
            account.maxAllocation,
            account.dailySpendLimit,
            account.weeklySpendLimit,
            account.dailySpent,
            account.weeklySpent,
            account.expiryDate,
            expired
        );
    }

    function getMerchantProfile(
        address _merchant
    )
        external
        view
        returns (
            MerchantCategory category,
            string memory businessName,
            bool verified,
            uint256 totalReceived
        )
    {
        MerchantProfile memory profile = merchants[_merchant];
        return (
            profile.category,
            profile.businessName,
            profile.verified,
            profile.totalReceived
        );
    }

    function getTokenStats()
        external
        view
        returns (
            uint256 minted,
            uint256 expired,
            uint256 active,
            uint256 donations
        )
    {
        return (
            totalTokensMinted,
            totalTokensExpired,
            totalTokensMinted - totalTokensExpired,
            totalDonations
        );
    }

    function getRoleStats()
        external
        view
        returns (
            uint256 admins,
            uint256 donors,
            uint256 beneficiaryCount,
            uint256 merchantCount
        )
    {
        return (
            roleCount[Role.Admin],
            roleCount[Role.Donor],
            roleCount[Role.Beneficiary],
            roleCount[Role.Merchant]
        );
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getCategoryName(
        MerchantCategory _category
    ) external pure returns (string memory) {
        if (_category == MerchantCategory.Food) return "Food";
        if (_category == MerchantCategory.Medicine) return "Medicine";
        if (_category == MerchantCategory.Emergency) return "Emergency";
        return "None";
    }

    // ============= PHASE-2: PIN AUTHENTICATION =============

    /**
     * @dev Set PIN hash for user (called by backend after PIN entry)
     */
    function setPINHash(address _user, bytes32 _pinHash) external onlyAdmin {
        require(users[_user].isActive, "User not active");
        pinHashes[_user] = _pinHash;
        hasPIN[_user] = true;
        emit PINSet(_user, block.timestamp);
    }

    /**
     * @dev Reset PIN (admin can force reset)
     */
    function resetPIN(address _user) external onlyAdmin {
        require(hasPIN[_user], "User has no PIN");
        delete pinHashes[_user];
        hasPIN[_user] = false;
        emit PINReset(_user, block.timestamp);
    }

    /**
     * @dev Authorize a relayer to submit transactions on behalf of user
     */
    function authorizeRelayer(address _relayer) external {
        require(users[msg.sender].isActive, "User not active");
        relayers[msg.sender] = _relayer;
        emit RelayerAuthorized(msg.sender, _relayer, block.timestamp);
    }

    /**
     * @dev Admin adds trusted relayer (backend service)
     */
    function addTrustedRelayer(address _relayer) external onlyAdmin {
        trustedRelayers[_relayer] = true;
    }

    /**
     * @dev Admin removes trusted relayer
     */
    function removeTrustedRelayer(address _relayer) external onlyAdmin {
        trustedRelayers[_relayer] = false;
    }

    /**
     * @dev Relayed spending - backend submits transaction on behalf of user
     * @param _user The beneficiary spending tokens
     * @param _merchant The merchant receiving tokens
     * @param _amount Amount of tokens
     * @param _description Payment description
     * @param _pinHash Hash of PIN provided by user
     * @param _nonce Nonce for replay protection
     */
    function relaySpendTokens(
        address _user,
        address _merchant,
        uint256 _amount,
        string calldata _description,
        bytes32 _pinHash,
        uint256 _nonce
    ) external whenNotPaused {
        require(trustedRelayers[msg.sender], "Not trusted relayer");
        require(hasPIN[_user], "User has no PIN");
        require(pinHashes[_user] == _pinHash, "Invalid PIN");
        require(nonces[_user] == _nonce, "Invalid nonce");

        // Increment nonce to prevent replay
        nonces[_user]++;

        // Execute spending logic (same as spendTokens but without msg.sender)
        require(users[_user].role == Role.Beneficiary, "Not a beneficiary");
        require(users[_merchant].role == Role.Merchant, "Not a merchant");
        require(merchants[_merchant].verified, "Merchant not verified");

        BeneficiaryAccount storage account = beneficiaries[_user];
        MerchantProfile storage merchant = merchants[_merchant];

        // Check expiry
        require(block.timestamp < account.expiryDate, "Tokens expired");

        // Calculate available balance
        uint256 available = account.allocatedTokens - account.spentTokens;
        require(available >= _amount, "Insufficient balance");

        // Check daily limit
        if (block.timestamp - account.lastSpendDate >= 1 days) {
            account.dailySpent = 0;
            account.lastSpendDate = block.timestamp;
        }
        require(
            account.dailySpent + _amount <= account.dailySpendLimit,
            "Daily limit exceeded"
        );

        // Check weekly limit
        if (block.timestamp - account.weekStartDate >= 7 days) {
            account.weeklySpent = 0;
            account.weekStartDate = block.timestamp;
        }
        require(
            account.weeklySpent + _amount <= account.weeklySpendLimit,
            "Weekly limit exceeded"
        );

        // Update balances
        account.spentTokens += _amount;
        account.dailySpent += _amount;
        account.weeklySpent += _amount;
        merchant.totalReceived += _amount;

        emit TokensSpent(
            _user,
            _merchant,
            merchant.category,
            _amount,
            _description,
            block.timestamp
        );

        emit RelayedTransaction(
            _user,
            msg.sender,
            "spend_tokens",
            block.timestamp
        );
    }

    /**
     * @dev Get user's current nonce
     */
    function getNonce(address _user) external view returns (uint256) {
        return nonces[_user];
    }

    /**
     * @dev Check if user has PIN set
     */
    function userHasPIN(address _user) external view returns (bool) {
        return hasPIN[_user];
    }

    // ============= FALLBACK =============

    receive() external payable {
        totalDonations += msg.value;
        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }
}
