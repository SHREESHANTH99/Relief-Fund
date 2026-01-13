import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import styles from "@/styles/QRScanner.module.css";

const QRScanner = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef(null);

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
          qrbox: { width: 180, height: 180 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
          rememberLastUsedCamera: true,
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
        setScanSuccess(true);
        setTimeout(() => {
          stopScanner();
          // Pass the JSON string, not the parsed object
          onScanSuccess(decodedText);
        }, 800);
      } else {
        setError("Invalid QR code. Please scan a merchant payment QR.");
      }
    } catch (err) {
      setError("Invalid QR code format");
    }
  };

  const onScanErrorHandler = (errorMessage) => {
    // Ignore frequent scanning errors, only log critical ones
    if (
      errorMessage.includes("NotFoundException") ||
      errorMessage.includes("IndexSizeError")
    ) {
      return; // No QR code in frame yet or canvas not ready
    }
    console.log("Scan error:", errorMessage);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      const decodedText = await html5QrCode.scanFile(file, false);

      // Parse and validate the QR code
      const qrData = JSON.parse(decodedText);

      if (qrData.type === "merchant_payment") {
        setScanSuccess(true);
        // Stop scanner and call success callback with JSON string
        setTimeout(() => {
          stopScanner();
          onScanSuccess(decodedText);
        }, 800);
      } else {
        setError("Invalid QR code. Please scan a merchant payment QR.");
      }
    } catch (err) {
      console.error("File scan error:", err);
      setError("Failed to scan QR code from image. Please try again.");
    }
  };

  return (
    <div className={styles.scannerOverlay} onClick={onClose}>
      <div className={styles.scannerModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <span className={styles.closeIcon}>✕</span>
        </button>

        <div className={styles.scannerBody}>
          <div className={styles.scannerHeader}>
            <h3 className={styles.title}>Scan QR Code</h3>
            <p className={styles.subtitle}>
              {scanSuccess
                ? "✓ QR Code Detected!"
                : "Align QR code within the frame"}
            </p>
          </div>

          <div className={styles.scannerContainer}>
            {/* Scanning Frame with Corner Guides */}
            <div
              className={`${styles.scanFrame} ${
                scanSuccess ? styles.success : ""
              }`}
            >
              <div className={styles.cornerTopLeft}></div>
              <div className={styles.cornerTopRight}></div>
              <div className={styles.cornerBottomLeft}></div>
              <div className={styles.cornerBottomRight}></div>

              {/* Animated Scanning Line */}
              {isScanning && !scanSuccess && (
                <div className={styles.scanLine}></div>
              )}

              {/* Success Check */}
              {scanSuccess && <div className={styles.successIcon}>✓</div>}
            </div>

            {/* QR Reader */}
            <div id="qr-reader" className={styles.qrReader}></div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <span>{error}</span>
              <button
                className={styles.retryButton}
                onClick={() => {
                  setError(null);
                  stopScanner();
                  startScanner();
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!error && isScanning && !scanSuccess && (
            <div className={styles.scanningStatus}>
              <div className={styles.pulseIndicator}></div>
              <span>Scanning...</span>
            </div>
          )}

          {/* Hidden div for file scanning */}
          <div id="qr-reader-file" style={{ display: "none" }}></div>

          {/* File Upload Option */}
          {!scanSuccess && (
            <div className={styles.uploadSection}>
              <div className={styles.divider}>
                <span>OR</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <button
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Upload QR Image
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
