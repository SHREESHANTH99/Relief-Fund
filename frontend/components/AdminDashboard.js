import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import OnboardingQR from "./OnboardingQR";
import AdminOfflineMonitoring from "./AdminOfflineMonitoring";
import styles from "@/styles/AdminDashboard.module.css";

const RELIEF_TOKEN_ABI = [
  "function assignRole(address _user, uint8 _role) external",
  "function allocateTokens(address _beneficiary, uint256 _amount, uint256 _expiryDuration) external",
  "function registerMerchant(address _merchant, uint8 _category, string _businessName) external",
  "function setUserLimits(address _beneficiary, uint256 _maxAllocation, uint256 _dailyLimit, uint256 _weeklyLimit) external",
  "function batchExpireTokens(address[] _beneficiaries) external",
  "function pause() external",
  "function unpause() external",
  "function getTokenStats() view returns (uint256 minted, uint256 expired, uint256 active, uint256 donations)",
  "function getRoleStats() view returns (uint256 admins, uint256 donors, uint256 beneficiaries, uint256 merchants)",
];

const AdminDashboard = ({ address, contract }) => {
  const [activeTab, setActiveTab] = useState("allocate");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showOnboardingQR, setShowOnboardingQR] = useState(false);

  // Form States
  const [allocateForm, setAllocateForm] = useState({
    beneficiary: "",
    amount: "",
    expiryDays: "30",
  });

  const [registerBeneficiaryForm, setRegisterBeneficiaryForm] = useState({
    address: "",
    maxAllocation: "1000",
    dailyLimit: "50",
    weeklyLimit: "300",
  });

  const [registerMerchantForm, setRegisterMerchantForm] = useState({
    address: "",
    category: "1",
    businessName: "",
  });

  const [assignRoleForm, setAssignRoleForm] = useState({
    address: "",
    role: "3",
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [contract]);

  const fetchStats = async () => {
    try {
      if (!contract) return;

      const tokenStats = await contract.getTokenStats();
      const roleStats = await contract.getRoleStats();

      setStats({
        tokensMinted: ethers.formatEther(tokenStats[0]),
        tokensExpired: ethers.formatEther(tokenStats[1]),
        tokensActive: ethers.formatEther(tokenStats[2]),
        donations: ethers.formatEther(tokenStats[3]),
        admins: roleStats[0].toString(),
        donors: roleStats[1].toString(),
        beneficiaries: roleStats[2].toString(),
        merchants: roleStats[3].toString(),
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // Allocate Tokens
  const handleAllocateTokens = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const amount = ethers.parseEther(allocateForm.amount);
      const expiryDuration = parseInt(allocateForm.expiryDays) * 24 * 60 * 60;

      const tx = await contractWithSigner.allocateTokens(
        allocateForm.beneficiary,
        amount,
        expiryDuration
      );

      showMessage("info", "Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      showMessage(
        "success",
        `✅ Allocated ${allocateForm.amount} tokens successfully!`
      );
      setAllocateForm({ beneficiary: "", amount: "", expiryDays: "30" });
      fetchStats();
    } catch (err) {
      console.error("Error allocating tokens:", err);
      showMessage("error", err.message || "Failed to allocate tokens");
    } finally {
      setLoading(false);
    }
  };

  // Register Beneficiary
  const handleRegisterBeneficiary = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // First assign role
      const tx1 = await contractWithSigner.assignRole(
        registerBeneficiaryForm.address,
        3
      ); // Role.Beneficiary = 3
      showMessage("info", "Assigning role. Waiting for confirmation...");
      await tx1.wait();

      // Then set limits if not default
      if (
        registerBeneficiaryForm.maxAllocation !== "1000" ||
        registerBeneficiaryForm.dailyLimit !== "50" ||
        registerBeneficiaryForm.weeklyLimit !== "300"
      ) {
        const tx2 = await contractWithSigner.setUserLimits(
          registerBeneficiaryForm.address,
          ethers.parseEther(registerBeneficiaryForm.maxAllocation),
          ethers.parseEther(registerBeneficiaryForm.dailyLimit),
          ethers.parseEther(registerBeneficiaryForm.weeklyLimit)
        );

        showMessage("info", "Setting custom limits...");
        await tx2.wait();
      }

      showMessage("success", "✅ Beneficiary registered successfully!");
      setRegisterBeneficiaryForm({
        address: "",
        maxAllocation: "1000",
        dailyLimit: "50",
        weeklyLimit: "300",
      });
      fetchStats();
    } catch (err) {
      console.error("Error registering beneficiary:", err);
      showMessage("error", err.message || "Failed to register beneficiary");
    } finally {
      setLoading(false);
    }
  };

  // Register Merchant
  const handleRegisterMerchant = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // First assign merchant role
      const tx1 = await contractWithSigner.assignRole(
        registerMerchantForm.address,
        4
      ); // Role.Merchant = 4
      showMessage("info", "Assigning merchant role...");
      await tx1.wait();

      // Then register merchant profile
      const tx2 = await contractWithSigner.registerMerchant(
        registerMerchantForm.address,
        parseInt(registerMerchantForm.category),
        registerMerchantForm.businessName
      );

      showMessage("info", "Registering merchant profile...");
      await tx2.wait();

      showMessage("success", "✅ Merchant registered successfully!");
      setRegisterMerchantForm({ address: "", category: "1", businessName: "" });
      fetchStats();
    } catch (err) {
      console.error("Error registering merchant:", err);
      showMessage("error", err.message || "Failed to register merchant");
    } finally {
      setLoading(false);
    }
  };

  // Assign Role
  const handleAssignRole = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.assignRole(
        assignRoleForm.address,
        parseInt(assignRoleForm.role)
      );

      showMessage("info", "Assigning role. Waiting for confirmation...");
      await tx.wait();

      showMessage(
        "success",
        `✅ Role assigned successfully to ${assignRoleForm.address.slice(
          0,
          6
        )}...${assignRoleForm.address.slice(-4)}`
      );
      setAssignRoleForm({ address: "", role: "3" });
      fetchStats();
    } catch (err) {
      console.error("Error assigning role:", err);
      showMessage(
        "error",
        err.reason || "Failed to assign role. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>👨‍💼 Admin Dashboard</h1>
        <p className={styles.address}>
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🪙</div>
            <div className={styles.statInfo}>
              <div className={styles.statLabel}>Tokens Minted</div>
              <div className={styles.statValue}>
                {parseFloat(stats.tokensMinted).toFixed(2)}
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statInfo}>
              <div className={styles.statLabel}>Active Tokens</div>
              <div className={styles.statValue}>
                {parseFloat(stats.tokensActive).toFixed(2)}
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>⏰</div>
            <div className={styles.statInfo}>
              <div className={styles.statLabel}>Expired Tokens</div>
              <div className={styles.statValue}>
                {parseFloat(stats.tokensExpired).toFixed(2)}
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <div className={styles.statLabel}>Total Users</div>
              <div className={styles.statValue}>
                {parseInt(stats.beneficiaries) + parseInt(stats.merchants)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "allocate" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("allocate")}
        >
          💰 Allocate Tokens
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "beneficiary" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("beneficiary")}
        >
          👤 Register Beneficiary
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "merchant" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("merchant")}
        >
          🏪 Register Merchant
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "assignRole" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("assignRole")}
        >
          👥 Assign Role
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "offline" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("offline")}
        >
          📦 Offline Monitor
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "onboarding" ? styles.active : ""
          }`}
          onClick={() => setShowOnboardingQR(true)}
        >
          📱 Generate Onboarding QR
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Allocate Tokens Tab */}
        {activeTab === "allocate" && (
          <form className={styles.form} onSubmit={handleAllocateTokens}>
            <h3>💰 Allocate Relief Tokens</h3>
            <p className={styles.formDescription}>
              Allocate stable relief tokens to beneficiaries. 1 Token = 1 Relief
              Unit (e.g., 1 meal)
            </p>

            <div className={styles.formGroup}>
              <label>Beneficiary Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={allocateForm.beneficiary}
                onChange={(e) =>
                  setAllocateForm({
                    ...allocateForm,
                    beneficiary: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Token Amount (Relief Units)</label>
              <input
                type="number"
                placeholder="100"
                min="1"
                step="0.01"
                value={allocateForm.amount}
                onChange={(e) =>
                  setAllocateForm({ ...allocateForm, amount: e.target.value })
                }
                required
              />
              <small>1 token = 1 relief unit (e.g., 1 meal equivalent)</small>
            </div>

            <div className={styles.formGroup}>
              <label>Expiry Duration (Days)</label>
              <select
                value={allocateForm.expiryDays}
                onChange={(e) =>
                  setAllocateForm({
                    ...allocateForm,
                    expiryDays: e.target.value,
                  })
                }
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days (default)</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
              <small>Unspent tokens will expire and return to pool</small>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Processing..." : "💰 Allocate Tokens"}
            </button>
          </form>
        )}

        {/* Register Beneficiary Tab */}
        {activeTab === "beneficiary" && (
          <form className={styles.form} onSubmit={handleRegisterBeneficiary}>
            <h3>🤝 Register New Beneficiary</h3>
            <p className={styles.formDescription}>
              Register a new beneficiary with custom spending limits
            </p>

            <div className={styles.formGroup}>
              <label>Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={registerBeneficiaryForm.address}
                onChange={(e) =>
                  setRegisterBeneficiaryForm({
                    ...registerBeneficiaryForm,
                    address: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Max Allocation (Total Tokens)</label>
              <input
                type="number"
                placeholder="1000"
                min="1"
                value={registerBeneficiaryForm.maxAllocation}
                onChange={(e) =>
                  setRegisterBeneficiaryForm({
                    ...registerBeneficiaryForm,
                    maxAllocation: e.target.value,
                  })
                }
                required
              />
              <small>
                Maximum tokens this beneficiary can receive in total
              </small>
            </div>

            <div className={styles.formGroup}>
              <label>Daily Spending Limit</label>
              <input
                type="number"
                placeholder="50"
                min="1"
                value={registerBeneficiaryForm.dailyLimit}
                onChange={(e) =>
                  setRegisterBeneficiaryForm({
                    ...registerBeneficiaryForm,
                    dailyLimit: e.target.value,
                  })
                }
                required
              />
              <small>Maximum tokens that can be spent per day</small>
            </div>

            <div className={styles.formGroup}>
              <label>Weekly Spending Limit</label>
              <input
                type="number"
                placeholder="300"
                min="1"
                value={registerBeneficiaryForm.weeklyLimit}
                onChange={(e) =>
                  setRegisterBeneficiaryForm({
                    ...registerBeneficiaryForm,
                    weeklyLimit: e.target.value,
                  })
                }
                required
              />
              <small>Maximum tokens that can be spent per week</small>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Processing..." : "🤝 Register Beneficiary"}
            </button>
          </form>
        )}

        {/* Register Merchant Tab */}
        {activeTab === "merchant" && (
          <form className={styles.form} onSubmit={handleRegisterMerchant}>
            <h3>🏪 Register New Merchant</h3>
            <p className={styles.formDescription}>
              Register verified merchants in allowed categories
            </p>

            <div className={styles.formGroup}>
              <label>Merchant Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={registerMerchantForm.address}
                onChange={(e) =>
                  setRegisterMerchantForm({
                    ...registerMerchantForm,
                    address: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Business Name</label>
              <input
                type="text"
                placeholder="e.g., City Food Store"
                value={registerMerchantForm.businessName}
                onChange={(e) =>
                  setRegisterMerchantForm({
                    ...registerMerchantForm,
                    businessName: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Category (Category-Restricted Spending)</label>
              <select
                value={registerMerchantForm.category}
                onChange={(e) =>
                  setRegisterMerchantForm({
                    ...registerMerchantForm,
                    category: e.target.value,
                  })
                }
                required
              >
                <option value="1">🍕 Food</option>
                <option value="2">💊 Medicine</option>
                <option value="3">🚨 Emergency Supplies</option>
              </select>
              <small>
                Tokens can only be spent at merchants in allowed categories
              </small>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Processing..." : "🏪 Register Merchant"}
            </button>
          </form>
        )}

        {/* Assign Role Tab */}
        {activeTab === "assignRole" && (
          <form className={styles.form} onSubmit={handleAssignRole}>
            <h3>👥 Assign Role to Wallet</h3>
            <p className={styles.formDescription}>
              Assign roles to wallet addresses to grant access and permissions
            </p>

            <div className={styles.formGroup}>
              <label>Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={assignRoleForm.address}
                onChange={(e) =>
                  setAssignRoleForm({
                    ...assignRoleForm,
                    address: e.target.value,
                  })
                }
                required
              />
              <small>Enter the Ethereum wallet address</small>
            </div>

            <div className={styles.formGroup}>
              <label>Role</label>
              <select
                value={assignRoleForm.role}
                onChange={(e) =>
                  setAssignRoleForm({
                    ...assignRoleForm,
                    role: e.target.value,
                  })
                }
                required
              >
                <option value="1">👨‍💼 Admin - Full system control</option>
                <option value="2">💰 Donor - Can donate funds</option>
                <option value="3">
                  👤 Beneficiary - Receives relief tokens
                </option>
                <option value="4">🏪 Merchant - Accepts token payments</option>
              </select>
              <small>
                Admin: Full control | Donor: Can donate | Beneficiary: Receives
                tokens | Merchant: Accepts payments
              </small>
            </div>

            <div className={styles.rolePreview}>
              <div className={styles.rolePreviewHeader}>
                <span>📋 Role Preview</span>
              </div>
              <div className={styles.rolePreviewContent}>
                {assignRoleForm.role === "1" && (
                  <>
                    <strong>Admin</strong>
                    <p>Can allocate tokens, register users, manage system</p>
                  </>
                )}
                {assignRoleForm.role === "2" && (
                  <>
                    <strong>Donor</strong>
                    <p>Can contribute ETH donations to the relief fund</p>
                  </>
                )}
                {assignRoleForm.role === "3" && (
                  <>
                    <strong>Beneficiary</strong>
                    <p>
                      Receives relief tokens with spending limits and expiry
                    </p>
                  </>
                )}
                {assignRoleForm.role === "4" && (
                  <>
                    <strong>Merchant</strong>
                    <p>Can accept token payments from beneficiaries</p>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Processing..." : "👥 Assign Role"}
            </button>
          </form>
        )}

        {/* Offline Monitor Tab */}
        {activeTab === "offline" && <AdminOfflineMonitoring />}
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <h4>ℹ️ Phase-1 Relief Token System</h4>
        <ul>
          <li>
            <strong>Stable Token:</strong> 1 Token = 1 Relief Unit
            (non-volatile)
          </li>
          <li>
            <strong>Per-User Caps:</strong> Max allocation, daily & weekly
            limits
          </li>
          <li>
            <strong>Token Expiry:</strong> Unspent tokens automatically expire
          </li>
          <li>
            <strong>Category Restrictions:</strong> Only Food, Medicine,
            Emergency
          </li>
          <li>
            <strong>No Trading:</strong> Tokens cannot be transferred or sold
          </li>
        </ul>
      </div>

      {/* Onboarding QR Modal */}
      {showOnboardingQR && (
        <OnboardingQR onClose={() => setShowOnboardingQR(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
