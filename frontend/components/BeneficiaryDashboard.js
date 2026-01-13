import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import styles from "@/styles/BeneficiaryDashboard.module.css";
import PINAuth from "./PINAuth";
import QRScanner from "./QRScanner";
import PaymentConfirmation from "./PaymentConfirmation";
import axios from "axios";

const BeneficiaryDashboard = ({ address, contract }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("home");

  // PIN and Payment States
  const [hasPIN, setHasPIN] = useState(false);
  const [showPINSetup, setShowPINSetup] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [scannedMerchant, setScannedMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Manual payment form
  const [spendForm, setSpendForm] = useState({
    merchant: "",
    amount: "",
    description: "",
  });
  const [showPINVerify, setShowPINVerify] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    if (address && contract) {
      fetchAccountInfo();
      checkPINStatus();
      fetchTransactions();
      const interval = setInterval(() => {
        fetchAccountInfo();
        fetchTransactions();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [address, contract]);

  const fetchAccountInfo = async () => {
    try {
      if (!contract || !address) return;

      const accountData = await contract.getBeneficiaryAccount(address);

      const now = Math.floor(Date.now() / 1000);
      const expiryDate = Number(accountData[8]);
      const timeLeft = expiryDate > now ? expiryDate - now : 0;

      setAccount({
        allocatedTokens: ethers.formatEther(accountData[0]),
        spentTokens: ethers.formatEther(accountData[1]),
        availableTokens: ethers.formatEther(accountData[2]),
        maxAllocation: ethers.formatEther(accountData[3]),
        dailySpendLimit: ethers.formatEther(accountData[4]),
        weeklySpendLimit: ethers.formatEther(accountData[5]),
        dailySpent: ethers.formatEther(accountData[6]),
        weeklySpent: ethers.formatEther(accountData[7]),
        expiryDate: expiryDate,
        isExpired: accountData[9],
        timeLeft: timeLeft,
      });
      setLoading(false);
    } catch (err) {
      console.error("Error fetching account:", err);
      setLoading(false);
    }
  };

  const checkPINStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.get(`${apiUrl}/api/auth/has-pin/${address}`);
      setHasPIN(response.data.hasPIN);
      // Cache PIN status in localStorage
      localStorage.setItem(`hasPIN_${address}`, response.data.hasPIN);
    } catch (err) {
      console.error("Error checking PIN status:", err);
      // Try to use cached PIN status
      const cachedPIN = localStorage.getItem(`hasPIN_${address}`);
      setHasPIN(cachedPIN === "true");
    }
  };

  const fetchTransactions = async () => {
    try {
      if (!contract || !address) return;

      const filter = contract.filters.TokensSpent(address);

      // Get current block number to determine safe range
      const provider = contract.runner.provider;
      const currentBlock = await provider.getBlockNumber();

      // Use safe block range: start from block 0 or (currentBlock - 100)
      const fromBlock = Math.max(0, currentBlock - 1000);
      const events = await contract.queryFilter(filter, fromBlock, "latest");

      const txs = events.map((event) => ({
        merchant: event.args.merchant,
        category: event.args.category || 0, // Category field added
        amount: ethers.formatEther(event.args.amount),
        description: event.args.description,
        timestamp: new Date(Number(event.args.timestamp) * 1000),
        txHash: event.transactionHash,
      }));

      setTransactions(txs.reverse());
      console.log(
        "✅ Fetched",
        txs.length,
        "transactions from block",
        fromBlock
      );
    } catch (err) {
      console.error("Error fetching transactions:", err);
      // Set empty transactions on error to prevent UI issues
      setTransactions([]);
    }
  };

  const handlePINSetup = async (pin) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.post(`${apiUrl}/api/auth/set-pin`, {
        address,
        pin,
      });

      if (response.data.success) {
        setHasPIN(true);
        setShowPINSetup(false);
        // Update cached PIN status
        localStorage.setItem(`hasPIN_${address}`, "true");
        showMessage(
          "success",
          "✅ PIN set successfully! You can now make quick payments."
        );
      }
    } catch (err) {
      console.error("Error setting PIN:", err);
      showMessage("error", "Failed to set PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (data) => {
    try {
      const merchantData = JSON.parse(data);
      console.log("📱 Scanned QR data:", merchantData);

      if (merchantData.type === "merchant_payment") {
        setScannedMerchant(merchantData);
        setShowQRScanner(false);
        setShowPaymentModal(true);
      } else {
        showMessage(
          "error",
          "Invalid QR code. Please scan a merchant payment QR."
        );
      }
    } catch (err) {
      console.error("QR parse error:", err);
      showMessage("error", "Failed to read QR code.");
    }
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setScannedMerchant(null);
    await fetchAccountInfo();
    await fetchTransactions();
    showMessage("success", "✅ Payment successful!");
  };

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return "Expired";

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleSpendTokens = async (e) => {
    e.preventDefault();

    // Check if PIN is set up
    if (!hasPIN) {
      showMessage("error", "Please setup PIN first to make payments");
      setShowPINSetup(true);
      return;
    }

    // Store payment details and show PIN verification
    setPendingPayment({
      merchant: spendForm.merchant,
      amount: spendForm.amount,
      description: spendForm.description,
    });
    setShowPINVerify(true);
  };

  const executePendingPayment = async () => {
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const amount = ethers.parseEther(pendingPayment.amount);

      const tx = await contractWithSigner.spendTokens(
        pendingPayment.merchant,
        amount,
        pendingPayment.description
      );

      showMessage("info", "Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      showMessage(
        "success",
        `✅ Spent ${pendingPayment.amount} tokens successfully!`
      );
      setSpendForm({ merchant: "", amount: "", description: "" });
      setPendingPayment(null);
      fetchAccountInfo();
      fetchTransactions();
    } catch (err) {
      console.error("Error spending tokens:", err);
      showMessage("error", err.message || "Failed to spend tokens");
    } finally {
      setLoading(false);
    }
  };

  const handlePINVerified = async (pin) => {
    try {
      // Verify PIN with backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await axios.post(`${apiUrl}/api/auth/verify-pin`, {
        address,
        pin,
      });

      if (response.data.success) {
        setShowPINVerify(false);
        await executePendingPayment();
      } else {
        throw new Error("Invalid PIN");
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      throw new Error("Invalid PIN. Please try again.");
    }
  };

  if (loading && !account) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!account || parseFloat(account.allocatedTokens) === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>🤝</div>
              <div>
                <h1>Relief Wallet</h1>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.noTokens}>
          <div className={styles.noTokensIcon}>💰</div>
          <h2>No Tokens Allocated Yet</h2>
          <p>Contact an admin to receive relief tokens</p>
          <div className={styles.noTokensAddress}>
            Your Address: {address.slice(0, 10)}...{address.slice(-8)}
          </div>
        </div>
      </div>
    );
  }

  const dailyRemaining =
    parseFloat(account.dailySpendLimit) - parseFloat(account.dailySpent);
  const weeklyRemaining =
    parseFloat(account.weeklySpendLimit) - parseFloat(account.weeklySpent);
  const dailyPercent =
    (parseFloat(account.dailySpent) / parseFloat(account.dailySpendLimit)) *
    100;
  const weeklyPercent =
    (parseFloat(account.weeklySpent) / parseFloat(account.weeklySpendLimit)) *
    100;

  return (
    <div className={styles.dashboard}>
      {/* Modern Header with Gradient */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>💰</div>
            <div>
              <h1>Relief Wallet</h1>
              <p className={styles.address}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {!hasPIN && (
              <button
                className={styles.setupPINButton}
                onClick={() => setShowPINSetup(true)}
              >
                🔐 Setup PIN
              </button>
            )}
            {hasPIN && (
              <div className={styles.pinBadge}>
                <span className={styles.pinBadgeIcon}>✓</span>
                <span>PIN Enabled</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          <span className={styles.messageIcon}>
            {message.type === "success" && "✓"}
            {message.type === "error" && "✕"}
            {message.type === "info" && "ℹ"}
          </span>
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${
            activeTab === "home" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("home")}
        >
          <span className={styles.tabIcon}>🏠</span>
          <span>Home</span>
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "pay" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("pay")}
        >
          <span className={styles.tabIcon}>💳</span>
          <span>Pay</span>
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "history" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("history")}
        >
          <span className={styles.tabIcon}>📊</span>
          <span>History</span>
        </button>
      </div>

      {/* Home Tab */}
      {activeTab === "home" && (
        <>
          {/* Token Balance Card with Gradient */}
          <div className={styles.balanceCard}>
            <div className={styles.balanceGradient}></div>
            <div className={styles.balanceHeader}>
              <div>
                <div className={styles.balanceLabel}>Available Balance</div>
                <div className={styles.balanceAmount}>
                  {parseFloat(account.availableTokens).toFixed(2)}
                  <span className={styles.tokenUnit}>RELIEF</span>
                </div>
              </div>
              <div className={styles.tokenIconLarge}>💎</div>
            </div>

            <div className={styles.balanceDetails}>
              <div className={styles.balanceItem}>
                <span className={styles.balanceItemLabel}>Allocated</span>
                <span className={styles.balanceItemValue}>
                  {parseFloat(account.allocatedTokens).toFixed(2)}
                </span>
              </div>
              <div className={styles.balanceDivider}></div>
              <div className={styles.balanceItem}>
                <span className={styles.balanceItemLabel}>Spent</span>
                <span className={styles.balanceItemValue}>
                  {parseFloat(account.spentTokens).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions with Modern Design */}
          <div className={styles.quickActionsGrid}>
            <div
              className={`${styles.actionCard} ${styles.primary}`}
              onClick={() => {
                if (
                  !account.isExpired &&
                  parseFloat(account.availableTokens) > 0
                ) {
                  if (hasPIN) {
                    setShowQRScanner(true);
                  } else {
                    setShowPINSetup(true);
                    showMessage(
                      "info",
                      "Please setup PIN first to use payments"
                    );
                  }
                }
              }}
            >
              <div className={styles.actionCardIcon}>📱</div>
              <div className={styles.actionCardTitle}>Scan QR Code</div>
              <div className={styles.actionCardDesc}>
                Scan merchant QR to pay
              </div>
            </div>
            <div
              className={`${styles.actionCard} ${styles.secondary}`}
              onClick={() => {
                if (
                  !account.isExpired &&
                  parseFloat(account.availableTokens) > 0
                ) {
                  if (hasPIN) {
                    setActiveTab("pay");
                  } else {
                    setShowPINSetup(true);
                    showMessage(
                      "info",
                      "Please setup PIN first to use payments"
                    );
                  }
                }
              }}
            >
              <div className={styles.actionCardIcon}>💳</div>
              <div className={styles.actionCardTitle}>Manual Payment</div>
              <div className={styles.actionCardDesc}>
                Enter merchant details
              </div>
            </div>
          </div>

          {!hasPIN && (
            <div className={styles.setupPINCard}>
              <div className={styles.setupPINIcon}>🔐</div>
              <h3>Setup Your PIN First</h3>
              <p>Set up a 4-digit PIN to enable quick and secure payments</p>
              <button
                className={styles.primaryButton}
                onClick={() => setShowPINSetup(true)}
              >
                Setup PIN Now
              </button>
            </div>
          )}

          {hasPIN && (
            <>
              {/* Expiry Warning */}
              {account.timeLeft > 0 && (
                <div
                  className={`${styles.alertCard} ${
                    account.timeLeft < 7 * 24 * 60 * 60
                      ? styles.warning
                      : styles.info
                  }`}
                >
                  <div className={styles.alertIcon}>
                    {account.timeLeft < 7 * 24 * 60 * 60 ? "⚠️" : "⏰"}
                  </div>
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitle}>
                      {account.timeLeft < 7 * 24 * 60 * 60
                        ? "Tokens Expiring Soon!"
                        : "Token Expiry"}
                    </div>
                    <div className={styles.alertMessage}>
                      {formatTimeLeft(account.timeLeft)} remaining · Use your
                      tokens before they expire
                    </div>
                  </div>
                </div>
              )}

              {/* Spending Limits Progress */}
              <div className={styles.limitsCard}>
                <h3 className={styles.limitsTitle}>📊 Spending Limits</h3>

                <div className={styles.limitItem}>
                  <div className={styles.limitHeader}>
                    <span className={styles.limitLabel}>Daily Limit</span>
                    <span className={styles.limitValue}>
                      {parseFloat(account.dailySpent).toFixed(1)} /{" "}
                      {parseFloat(account.dailySpendLimit).toFixed(0)}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${
                        dailyPercent > 80 ? styles.warning : ""
                      }`}
                      style={{ width: `${Math.min(dailyPercent, 100)}%` }}
                    />
                  </div>
                  <small className={styles.limitRemaining}>
                    {dailyRemaining.toFixed(2)} tokens remaining today
                  </small>
                </div>

                <div className={styles.limitItem}>
                  <div className={styles.limitHeader}>
                    <span className={styles.limitLabel}>Weekly Limit</span>
                    <span className={styles.limitValue}>
                      {parseFloat(account.weeklySpent).toFixed(1)} /{" "}
                      {parseFloat(account.weeklySpendLimit).toFixed(0)}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${
                        weeklyPercent > 80 ? styles.warning : ""
                      }`}
                      style={{ width: `${Math.min(weeklyPercent, 100)}%` }}
                    />
                  </div>
                  <small className={styles.limitRemaining}>
                    {weeklyRemaining.toFixed(2)} tokens remaining this week
                  </small>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Pay Tab */}
      {activeTab === "pay" && (
        <div className={styles.paySection}>
          <div className={styles.paySectionHeader}>
            <h3>💳 Send Payment</h3>
            <p>Enter merchant details to make a payment</p>
          </div>

          <form className={styles.payForm} onSubmit={handleSpendTokens}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Merchant Address</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="0x..."
                value={spendForm.merchant}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, merchant: e.target.value })
                }
                required
                disabled={
                  account.isExpired || parseFloat(account.availableTokens) === 0
                }
              />
              <small className={styles.formHint}>
                Verified merchant wallet address
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount</label>
              <input
                type="number"
                className={styles.formInput}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                max={account.availableTokens}
                value={spendForm.amount}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, amount: e.target.value })
                }
                required
                disabled={
                  account.isExpired || parseFloat(account.availableTokens) === 0
                }
              />
              <small className={styles.formHint}>
                Available: {parseFloat(account.availableTokens).toFixed(2)}{" "}
                tokens
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Food purchase"
                value={spendForm.description}
                onChange={(e) =>
                  setSpendForm({ ...spendForm, description: e.target.value })
                }
                required
                disabled={
                  account.isExpired || parseFloat(account.availableTokens) === 0
                }
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading ||
                account.isExpired ||
                parseFloat(account.availableTokens) === 0
              }
            >
              {loading ? (
                <>
                  <span className={styles.buttonSpinner}></span> Processing...
                </>
              ) : (
                <>💸 Send Payment</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className={styles.historySection}>
          <div className={styles.historySectionHeader}>
            <h3>📊 Transaction History</h3>
            <p>{transactions.length} transactions</p>
          </div>

          {transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📝</div>
              <h4>No Transactions Yet</h4>
              <p>Your payment history will appear here</p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {transactions.map((tx, index) => (
                <div key={index} className={styles.transactionItem}>
                  <div className={styles.transactionIcon}>💸</div>
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionTitle}>
                      {tx.description}
                    </div>
                    <div className={styles.transactionMerchant}>
                      To: {tx.merchant.slice(0, 8)}...{tx.merchant.slice(-6)}
                    </div>
                    <div className={styles.transactionDate}>
                      {tx.timestamp.toLocaleDateString()} ·{" "}
                      {tx.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className={styles.transactionAmount}>
                    -{parseFloat(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showPINSetup && (
        <PINAuth
          mode="setup"
          onPINSet={handlePINSetup}
          onClose={() => setShowPINSetup(false)}
        />
      )}

      {showPINVerify && pendingPayment && (
        <PINAuth
          mode="verify"
          title="Enter PIN to Confirm Payment"
          onPINVerify={handlePINVerified}
          onClose={() => {
            setShowPINVerify(false);
            setPendingPayment(null);
          }}
        />
      )}

      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showPaymentModal && scannedMerchant && (
        <PaymentConfirmation
          merchantData={scannedMerchant}
          beneficiaryAddress={address}
          contract={contract}
          onSuccess={handlePaymentComplete}
          onClose={() => {
            setShowPaymentModal(false);
            setScannedMerchant(null);
          }}
        />
      )}
    </div>
  );
};

export default BeneficiaryDashboard;
