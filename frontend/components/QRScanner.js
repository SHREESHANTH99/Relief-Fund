import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import styles from "@/styles/QRScanner.module.css";

const QRScanner = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isScanning && !scannerRef.current) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    try {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(onScanSuccessHandler, onScanErrorHandler);
      scannerRef.current = scanner;
      setIsScanning(true);
    } catch (err) {
      console.error("Scanner initialization error:", err);
      setError("Failed to start camera. Please check permissions.");
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const onScanSuccessHandler = (decodedText) => {
    try {
      const qrData = JSON.parse(decodedText);

      if (qrData.type === "merchant_payment") {
        stopScanner();
        onScanSuccess(qrData);
      } else {
        setError("Invalid QR code. Please scan a merchant payment QR.");
      }
    } catch (err) {
      setError("Invalid QR code format");
    }
  };

  const onScanErrorHandler = (errorMessage) => {
    // Ignore frequent scanning errors, only log critical ones
    if (errorMessage.includes("NotFoundException")) {
      return; // No QR code in frame yet
    }
    console.log("Scan error:", errorMessage);
  };

  return (
    <div className={styles.scannerOverlay}>
      <div className={styles.scannerModal}>
        <div className={styles.scannerHeader}>
          <h3>📸 Scan Merchant QR Code</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.scannerBody}>
          <p className={styles.instruction}>
            Point your camera at the merchant's QR code
          </p>

          <div id="qr-reader" className={styles.qrReader}></div>

          {error && (
            <div className={styles.error}>
              {error}
              <button
                className={styles.retryButton}
                onClick={() => {
                  setError(null);
                  stopScanner();
                  startScanner();
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className={styles.scannerFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
