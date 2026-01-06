import { useState, useEffect } from "react";
import styles from "@/styles/PINAuth.module.css";

const PINAuth = ({ onPINSet, onPINVerify, onClose, mode = "setup", title }) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigitClick = (digit) => {
    if (mode === "setup") {
      if (!confirmPin && pin.length < 4) {
        setPin(pin + digit);
      } else if (confirmPin.length < 4) {
        setConfirmPin(confirmPin + digit);
      }
    } else if (mode === "verify") {
      if (pin.length < 4) {
        setPin(pin + digit);
      }
    }
    setError("");
  };

  const handleBackspace = () => {
    if (mode === "setup") {
      if (confirmPin) {
        setConfirmPin(confirmPin.slice(0, -1));
      } else {
        setPin(pin.slice(0, -1));
      }
    } else {
      setPin(pin.slice(0, -1));
    }
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setConfirmPin("");
    setError("");
  };

  useEffect(() => {
    if (mode === "setup" && pin.length === 4 && confirmPin.length === 4) {
      handleSubmit();
    } else if (mode === "verify" && pin.length === 4) {
      handleSubmit();
    }
  }, [pin, confirmPin]);

  const handleSubmit = async () => {
    if (mode === "setup") {
      if (pin !== confirmPin) {
        setError("PINs do not match");
        setConfirmPin("");
        return;
      }
      setLoading(true);
      try {
        await onPINSet(pin);
      } catch (err) {
        setError(err.message || "Failed to set PIN");
        handleClear();
      } finally {
        setLoading(false);
      }
    } else if (mode === "verify") {
      setLoading(true);
      try {
        await onPINVerify(pin);
      } catch (err) {
        setError(err.message || "Invalid PIN");
        setPin("");
      } finally {
        setLoading(false);
      }
    }
  };

  const renderPINDots = (value, label) => (
    <div className={styles.pinDisplay}>
      <div className={styles.pinLabel}>{label}</div>
      <div className={styles.pinDots}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`${styles.pinDot} ${
              value.length > i ? styles.filled : ""
            }`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.pinAuthContainer} onClick={onClose}>
      <div className={styles.pinCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h3 className={styles.title}>
          {title || (mode === "setup" ? "🔒 Set Your PIN" : "🔓 Enter PIN")}
        </h3>

        {mode === "setup" ? (
          <>
            {renderPINDots(pin, "Enter 4-digit PIN")}
            {pin.length === 4 && renderPINDots(confirmPin, "Confirm PIN")}
          </>
        ) : (
          renderPINDots(pin, "Enter your PIN")
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              className={styles.keypadButton}
              onClick={() => handleDigitClick(digit.toString())}
              disabled={loading}
            >
              {digit}
            </button>
          ))}
          <button
            className={styles.keypadButton}
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
          <button
            className={styles.keypadButton}
            onClick={() => handleDigitClick("0")}
            disabled={loading}
          >
            0
          </button>
          <button
            className={styles.keypadButton}
            onClick={handleBackspace}
            disabled={loading}
          >
            ⌫
          </button>
        </div>

        {loading && <div className={styles.loader}>Processing...</div>}
      </div>
    </div>
  );
};

export default PINAuth;
