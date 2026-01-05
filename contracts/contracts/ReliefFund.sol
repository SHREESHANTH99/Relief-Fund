// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReliefFund
 * @dev Core smart contract for disaster relief fund management
 * @notice Phase-1: Basic role management, event logging, and emergency pause
 */
contract ReliefFund {
    // ============= ROLES =============

    enum Role {
        None,
        Admin,
        Donor,
        Beneficiary,
        Merchant
    }

    struct User {
        Role role;
        bool isActive;
        uint256 registeredAt;
    }

    // ============= STATE VARIABLES =============

    address public owner;
    bool public paused;

    mapping(address => User) public users;
    mapping(Role => uint256) public roleCount;

    uint256 public totalDonations;
    uint256 public totalAllocated;
    uint256 public totalSpent;

    // ============= EVENTS =============

    event RoleAssigned(address indexed user, Role role, uint256 timestamp);
    event RoleRevoked(address indexed user, Role oldRole, uint256 timestamp);

    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    event AidAllocated(
        address indexed beneficiary,
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    event AidSpent(
        address indexed beneficiary,
        address indexed merchant,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    event EmergencyPause(address indexed by, uint256 timestamp);
    event EmergencyUnpause(address indexed by, uint256 timestamp);

    // ============= MODIFIERS =============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(
            users[msg.sender].role == Role.Admin || msg.sender == owner,
            "Only admin can perform this action"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    modifier onlyRole(Role _role) {
        require(users[msg.sender].role == _role, "Unauthorized role");
        require(users[msg.sender].isActive, "User is not active");
        _;
    }

    // ============= CONSTRUCTOR =============

    constructor() {
        owner = msg.sender;
        paused = false;

        // Owner is automatically an admin
        users[msg.sender] = User({
            role: Role.Admin,
            isActive: true,
            registeredAt: block.timestamp
        });
        roleCount[Role.Admin] = 1;

        emit RoleAssigned(msg.sender, Role.Admin, block.timestamp);
    }

    // ============= ROLE MANAGEMENT =============

    /**
     * @dev Assign a role to a user
     * @param _user Address of the user
     * @param _role Role to assign
     */
    function assignRole(
        address _user,
        Role _role
    ) external onlyAdmin whenNotPaused {
        require(_user != address(0), "Invalid address");
        require(_role != Role.None, "Cannot assign None role");
        require(users[_user].role == Role.None, "User already has a role");

        users[_user] = User({
            role: _role,
            isActive: true,
            registeredAt: block.timestamp
        });

        roleCount[_role]++;

        emit RoleAssigned(_user, _role, block.timestamp);
    }

    /**
     * @dev Revoke a user's role
     * @param _user Address of the user
     */
    function revokeRole(address _user) external onlyAdmin whenNotPaused {
        require(_user != owner, "Cannot revoke owner role");
        require(users[_user].role != Role.None, "User has no role");

        Role oldRole = users[_user].role;
        users[_user].role = Role.None;
        users[_user].isActive = false;

        roleCount[oldRole]--;

        emit RoleRevoked(_user, oldRole, block.timestamp);
    }

    /**
     * @dev Toggle user active status
     * @param _user Address of the user
     */
    function toggleUserStatus(address _user) external onlyAdmin whenNotPaused {
        require(_user != owner, "Cannot toggle owner status");
        require(users[_user].role != Role.None, "User has no role");

        users[_user].isActive = !users[_user].isActive;
    }

    // ============= DONATION FUNCTIONS =============

    /**
     * @dev Receive donations (any address can donate)
     */
    function donate() external payable whenNotPaused {
        require(msg.value > 0, "Donation must be greater than 0");

        totalDonations += msg.value;

        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Allocate aid to a beneficiary (Admin only)
     * @param _beneficiary Address of the beneficiary
     * @param _amount Amount to allocate
     * @param _reason Reason for allocation
     */
    function allocateAid(
        address _beneficiary,
        uint256 _amount,
        string calldata _reason
    ) external onlyAdmin whenNotPaused {
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(_amount > 0, "Amount must be greater than 0");
        require(
            users[_beneficiary].role == Role.Beneficiary,
            "Not a beneficiary"
        );
        require(users[_beneficiary].isActive, "Beneficiary not active");
        require(
            address(this).balance >= _amount,
            "Insufficient contract balance"
        );

        totalAllocated += _amount;

        emit AidAllocated(_beneficiary, _amount, _reason, block.timestamp);
    }

    /**
     * @dev Record aid spending (Beneficiary spending at Merchant)
     * @param _merchant Address of the merchant
     * @param _amount Amount spent
     * @param _description Description of purchase
     */
    function recordSpending(
        address _merchant,
        uint256 _amount,
        string calldata _description
    ) external onlyRole(Role.Beneficiary) whenNotPaused {
        require(_merchant != address(0), "Invalid merchant address");
        require(_amount > 0, "Amount must be greater than 0");
        require(users[_merchant].role == Role.Merchant, "Not a merchant");
        require(users[_merchant].isActive, "Merchant not active");

        totalSpent += _amount;

        emit AidSpent(
            msg.sender,
            _merchant,
            _amount,
            _description,
            block.timestamp
        );
    }

    // ============= EMERGENCY FUNCTIONS =============

    /**
     * @dev Pause all contract operations
     */
    function pause() external onlyAdmin whenNotPaused {
        paused = true;
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyAdmin whenPaused {
        paused = false;
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Get user information
     * @param _user Address of the user
     */
    function getUserInfo(
        address _user
    ) external view returns (Role role, bool isActive, uint256 registeredAt) {
        User memory user = users[_user];
        return (user.role, user.isActive, user.registeredAt);
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get fund statistics
     */
    function getFundStats()
        external
        view
        returns (
            uint256 donations,
            uint256 allocated,
            uint256 spent,
            uint256 balance,
            bool isPaused
        )
    {
        return (
            totalDonations,
            totalAllocated,
            totalSpent,
            address(this).balance,
            paused
        );
    }

    /**
     * @dev Get role statistics
     */
    function getRoleStats()
        external
        view
        returns (
            uint256 admins,
            uint256 donors,
            uint256 beneficiaries,
            uint256 merchants
        )
    {
        return (
            roleCount[Role.Admin],
            roleCount[Role.Donor],
            roleCount[Role.Beneficiary],
            roleCount[Role.Merchant]
        );
    }

    // ============= FALLBACK =============

    receive() external payable {
        totalDonations += msg.value;
        emit DonationReceived(msg.sender, msg.value, block.timestamp);
    }
}
