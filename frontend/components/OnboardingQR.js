import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "@/styles/OnboardingQR.module.css";

const OnboardingQR = ({ onClose }) => {
  const [policyId, setPolicyId] = useState("RELIEF_2026");
  const [userType, setUserType] = useState("beneficiary");
  const [maxAllocation, setMaxAllocation] = useState("1000");
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("1");
  const [qrData, setQrData] = useState(null);

  const generateQR = () => {
    // Validate merchant fields
    if (userType === "merchant" && !businessName) {
      alert("Please enter business name for merchant");
      return;
    }

    // Generate a unique reference ID
    const uniqueId = `${userType.toUpperCase()}_${Date.now()
      .toString(36)
      .toUpperCase()}`;

    const data = {
      type: "onboarding",
      userType,
      referenceId: uniqueId,
      policyId,
      timestamp: Date.now(),
      expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      network: "hardhat-local",
    };

    // Add user type specific data
    if (userType === "beneficiary") {
      data.maxAllocation = parseFloat(maxAllocation);
    } else if (userType === "merchant") {
      data.businessName = businessName;
      data.category = parseInt(category);
    }

    setQrData(JSON.stringify(data));
  };

  const downloadQR = () => {
    const svg = document.getElementById("onboarding-qr");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      downloadLink.download = `onboarding-${userType}-${timestamp}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const categoryNames = {
    1: "Food",
    2: "Medicine",
    3: "Shelter",
    4: "Education",
    5: "Other",
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>👤 Generate Onboarding QR</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {!qrData ? (
            <>
              <div className={styles.infoBox}>
                <p>
                  Generate a QR code for new users to scan and onboard. The
                  system will automatically create a wallet for them.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>User Type</label>
                <select
                  className={styles.input}
                  value={userType}
                  onChange={(e) => {
                    setUserType(e.target.value);
                    // Reset fields when switching type
                    setBusinessName("");
                    setCategory("1");
                  }}
                >
                  <option value="beneficiary">Beneficiary</option>
                  <option value="merchant">Merchant</option>
                </select>
              </div>

              {userType === "beneficiary" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Policy ID</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="e.g., RELIEF_2026"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Max Allocation (RELIEF tokens)
                    </label>
                    <input
                      type="number"
                      className={styles.input}
                      value={maxAllocation}
                      onChange={(e) => setMaxAllocation(e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                </>
              )}

              {userType === "merchant" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Business Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Green Valley Pharmacy"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Business Category</label>
                    <select
                      className={styles.input}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="1">Food</option>
                      <option value="2">Medicine</option>
                      <option value="3">Shelter</option>
                      <option value="4">Education</option>
                      <option value="5">Other</option>
                    </select>
                  </div>
                </>
              )}

              <button className={styles.generateButton} onClick={generateQR}>
                Generate QR Code
              </button>
            </>
          ) : (
            <>
              <div className={styles.qrContainer}>
                <QRCodeSVG
                  id="onboarding-qr"
                  value={qrData}
                  size={300}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className={styles.qrInfo}>
                <div className={styles.infoRow}>
                  <span>User Type:</span>
                  <span className={styles.badge}>{userType}</span>
                </div>
                {userType === "beneficiary" ? (
                  <>
                    <div className={styles.infoRow}>
                      <span>Policy:</span>
                      <span>{policyId}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Max Allocation:</span>
                      <span>{maxAllocation} RELIEF</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.infoRow}>
                      <span>Business:</span>
                      <span>{businessName}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Category:</span>
                      <span>{categoryNames[category]}</span>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.instructions}>
                <h4>📱 User Instructions:</h4>
                <ol>
                  <li>Open the ReliefFund app</li>
                  <li>Tap "Scan Onboarding QR"</li>
                  <li>Point camera at this QR code</li>
                  <li>System creates wallet automatically</li>
                  <li>Set your 4-digit PIN</li>
                  <li>Start using the app!</li>
                </ol>
              </div>

              <div className={styles.actions}>
                <button className={styles.downloadButton} onClick={downloadQR}>
                  📥 Download QR
                </button>
                <button
                  className={styles.newButton}
                  onClick={() => {
                    setQrData(null);
                    setBusinessName("");
                    setCategory("1");
                  }}
                >
                  Generate New
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingQR;
