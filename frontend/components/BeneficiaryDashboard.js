import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import styles from "@/styles/BeneficiaryDashboard.module.css";

const BeneficiaryDashboard = ({ address, contract }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Spending form
  const [spendForm, setSpendForm] = useState({
    merchant: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    fetchAccountInfo();
    const interval = setInterval(fetchAccountInfo, 10000);
    return () => clearInterval(interval);
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
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const amount = ethers.parseEther(spendForm.amount);

      const tx = await contractWithSigner.spendTokens(
        spendForm.merchant,
        amount,
        spendForm.description
      );

      showMessage("info", "Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      showMessage(
        "success",
        `✅ Spent ${spendForm.amount} tokens successfully!`
      );
      setSpendForm({ merchant: "", amount: "", description: "" });
      fetchAccountInfo();
    } catch (err) {
      console.error("Error spending tokens:", err);
      showMessage("error", err.message || "Failed to spend tokens");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !account) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading your account...</div>
      </div>
    );
  }

  if (!account || parseFloat(account.allocatedTokens) === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1>🤝 Beneficiary Dashboard</h1>
        </div>
        <div className={styles.noTokens}>
          <div className={styles.noTokensIcon}>🪙</div>
          <h2>No Tokens Allocated Yet</h2>
          <p>Contact an admin to receive relief tokens</p>
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
      <div className={styles.header}>
        <h1>🤝 Your Relief Account</h1>
        <p className={styles.address}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Token Balance Card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceHeader}>
          <div>
            <div className={styles.balanceLabel}>Available Tokens</div>
            <div className={styles.balanceAmount}>
              {parseFloat(account.availableTokens).toFixed(2)}
              <span className={styles.tokenUnit}>RELIEF</span>
            </div>
          </div>
          <div className={styles.tokenIcon}>🪙</div>
        </div>

        <div className={styles.balanceFooter}>
          <div className={styles.balanceInfo}>
            <span>
              Allocated: {parseFloat(account.allocatedTokens).toFixed(2)}
            </span>
            <span>Spent: {parseFloat(account.spentTokens).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Expiry Warning */}
      {account.timeLeft > 0 && (
        <div
          className={`${styles.expiryCard} ${
            account.timeLeft < 7 * 24 * 60 * 60 ? styles.warning : ""
          }`}
        >
          <div className={styles.expiryIcon}>
            {account.timeLeft < 7 * 24 * 60 * 60 ? "⚠️" : "⏰"}
          </div>
          <div>
            <div className={styles.expiryLabel}>
              {account.timeLeft < 7 * 24 * 60 * 60
                ? "Tokens Expiring Soon!"
                : "Token Expiry"}
            </div>
            <div className={styles.expiryTime}>
              {formatTimeLeft(account.timeLeft)} remaining
            </div>
            <small>Unspent tokens will return to the pool after expiry</small>
          </div>
        </div>
      )}

      {account.isExpired && (
        <div className={styles.expiredCard}>
          <div className={styles.expiredIcon}>❌</div>
          <div>
            <div className={styles.expiredLabel}>Tokens Expired</div>
            <p>
              Your allocated tokens have expired. Contact admin for new
              allocation.
            </p>
          </div>
        </div>
      )}

      {/* Spending Limits */}
      <div className={styles.limitsGrid}>
        <div className={styles.limitCard}>
          <div className={styles.limitHeader}>
            <span className={styles.limitIcon}>📅</span>
            <span className={styles.limitTitle}>Daily Limit</span>
          </div>
          <div className={styles.limitBar}>
            <div
              className={styles.limitProgress}
              style={{ width: `${dailyPercent}%` }}
            ></div>
          </div>
          <div className={styles.limitInfo}>
            <span className={styles.limitSpent}>
              {parseFloat(account.dailySpent).toFixed(2)} spent
            </span>
            <span className={styles.limitRemaining}>
              {dailyRemaining.toFixed(2)} remaining
            </span>
          </div>
          <small>Resets daily</small>
        </div>

        <div className={styles.limitCard}>
          <div className={styles.limitHeader}>
            <span className={styles.limitIcon}>📆</span>
            <span className={styles.limitTitle}>Weekly Limit</span>
          </div>
          <div className={styles.limitBar}>
            <div
              className={styles.limitProgress}
              style={{ width: `${weeklyPercent}%` }}
            ></div>
          </div>
          <div className={styles.limitInfo}>
            <span className={styles.limitSpent}>
              {parseFloat(account.weeklySpent).toFixed(2)} spent
            </span>
            <span className={styles.limitRemaining}>
              {weeklyRemaining.toFixed(2)} remaining
            </span>
          </div>
          <small>Resets weekly</small>
        </div>
      </div>

      {/* QR Code Payment */}
      <div className={styles.qrSection}>
        <button
          className={styles.qrButton}
          onClick={() => setShowQR(!showQR)}
          disabled={
            parseFloat(account.availableTokens) === 0 || account.isExpired
          }
        >
          {showQR ? "✖️ Close QR Code" : "📱 Show Payment QR Code"}
        </button>

        {showQR && (
          <div className={styles.qrCard}>
            <div className={styles.qrCodeWrapper}>
              <QRCodeSVG
                value={JSON.stringify({
                  type: "relief_payment",
                  beneficiary: address,
                  network: "hardhat",
                  chainId: 31337,
                })}
                size={200}
                level="H"
              />
            </div>
            <p className={styles.qrInstructions}>
              Scan this QR code at verified merchants to make payments
            </p>
            <div className={styles.qrWallet}>
              <small>Your Wallet:</small>
              <div className={styles.qrAddress}>{address}</div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Spending Form */}
      <div className={styles.spendSection}>
        <h3>💳 Manual Payment</h3>
        <form className={styles.spendForm} onSubmit={handleSpendTokens}>
          <div className={styles.formGroup}>
            <label>Merchant Address</label>
            <input
              type="text"
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
            <small>Verified merchant wallet address</small>
          </div>

          <div className={styles.formGroup}>
            <label>Amount (Tokens)</label>
            <input
              type="number"
              placeholder="10"
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
            <small>
              Available: {parseFloat(account.availableTokens).toFixed(2)} tokens
            </small>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <input
              type="text"
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
            className={styles.spendButton}
            disabled={
              loading ||
              account.isExpired ||
              parseFloat(account.availableTokens) === 0
            }
          >
            {loading ? "Processing..." : "💸 Make Payment"}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <h4>ℹ️ How Relief Tokens Work</h4>
        <ul>
          <li>
            <strong>Stable Value:</strong> 1 Token = 1 Relief Unit (e.g., 1
            meal)
          </li>
          <li>
            <strong>Category Restricted:</strong> Valid only at Food, Medicine,
            Emergency merchants
          </li>
          <li>
            <strong>Daily Limits:</strong>{" "}
            {parseFloat(account.dailySpendLimit).toFixed(0)} tokens per day
          </li>
          <li>
            <strong>Weekly Limits:</strong>{" "}
            {parseFloat(account.weeklySpendLimit).toFixed(0)} tokens per week
          </li>
          <li>
            <strong>Expiry:</strong> Tokens expire after{" "}
            {Math.floor(account.timeLeft / (24 * 60 * 60))} days
          </li>
          <li>
            <strong>No Trading:</strong> Tokens cannot be transferred or sold
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BeneficiaryDashboard;
