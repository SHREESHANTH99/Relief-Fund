import { useState } from "react";
import { ethers } from "ethers";
import PINAuth from "./PINAuth";
import styles from "@/styles/PaymentConfirmation.module.css";

const PaymentConfirmation = ({
  merchantData,
  beneficiaryAddress,
  contract,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState("amount"); // amount, pin, processing
  const [error, setError] = useState("");
  const [availableBalance, setAvailableBalance] = useState(null);

  const categoryNames = ["None", "Food", "Medicine", "Emergency"];

  // Log merchant data for debugging
  console.log("💳 Payment Confirmation - Merchant Data:", merchantData);

  // Safe merchant name with fallback
  const merchantName =
    merchantData?.merchantName ||
    merchantData?.businessName ||
    "Unknown Merchant";
  const merchantCategory =
    merchantData?.category !== undefined
      ? categoryNames[merchantData.category]
      : "General";

  const handleAmountSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Fetch available balance
    try {
      const account = await contract.getBeneficiaryAccount(beneficiaryAddress);
      const allocated = ethers.formatEther(account[0]);
      const spent = ethers.formatEther(account[1]);
      const available = parseFloat(allocated) - parseFloat(spent);

      setAvailableBalance(available);

      if (parseFloat(amount) > available) {
        setError(
          `Insufficient balance. Available: ${available.toFixed(2)} RELIEF`
        );
        return;
      }

      setError("");
      setStep("pin");
    } catch (err) {
      console.error("Error checking balance:", err);
      setError("Failed to verify balance");
    }
  };

  const handlePINVerify = async (pin) => {
    setStep("processing");
    setError("");

    try {
      // Verify PIN with backend first
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const pinResponse = await fetch(`${apiUrl}/api/auth/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: beneficiaryAddress, pin }),
      });

      const pinData = await pinResponse.json();
      if (!pinData.success) {
        throw new Error("Invalid PIN");
      }

      // PIN verified, proceed with transaction
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      const amountInWei = ethers.parseEther(amount);

      // Call spendTokens function
      const tx = await contractWithSigner.spendTokens(
        merchantData.merchantAddress,
        amountInWei,
        description || "Payment via QR scan"
      );

      await tx.wait();

      onSuccess({
        amount,
        merchant: merchantName,
        txHash: tx.hash,
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed");
      setStep("pin");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {step === "amount" && (
          <>
            <div className={styles.header}>
              <h3>💳 Confirm Payment</h3>
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.merchantInfo}>
                <div className={styles.merchantIcon}>🏪</div>
                <div>
                  <div className={styles.merchantName}>{merchantName}</div>
                  <div className={styles.merchantCategory}>
                    {merchantCategory}
                  </div>
                </div>
              </div>

              {availableBalance !== null && (
                <div className={styles.balanceInfo}>
                  💰 Available Balance:{" "}
                  <strong>{availableBalance.toFixed(2)} RELIEF</strong>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (RELIEF Tokens)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Groceries, Medicine"
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button
                className={styles.continueButton}
                onClick={handleAmountSubmit}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "pin" && (
          <>
            <div className={styles.header}>
              <h3>🔒 Verify Payment</h3>
              <button
                className={styles.backButton}
                onClick={() => setStep("amount")}
              >
                ← Back
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.paymentSummary}>
                <div className={styles.summaryRow}>
                  <span>Merchant:</span>
                  <span>{merchantName}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Category:</span>
                  <span>{merchantCategory}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Amount:</span>
                  <span className={styles.amountHighlight}>
                    {amount} RELIEF
                  </span>
                </div>
                {description && (
                  <div className={styles.summaryRow}>
                    <span>Description:</span>
                    <span>{description}</span>
                  </div>
                )}
              </div>

              <PINAuth
                mode="verify"
                title="Enter PIN to Confirm"
                onPINVerify={handlePINVerify}
                onClose={() => setStep("amount")}
              />

              {error && <div className={styles.error}>{error}</div>}
            </div>
          </>
        )}

        {step === "processing" && (
          <div className={styles.processingContainer}>
            <div className={styles.spinner}></div>
            <h3>Processing Payment...</h3>
            <p>Please wait while we process your transaction</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmation;
