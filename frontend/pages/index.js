import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import WalletConnect from "@/components/WalletConnect";
import AdminDashboard from "@/components/AdminDashboard";
import BeneficiaryDashboard from "@/components/BeneficiaryDashboard";
import styles from "@/styles/Home.module.css";

const RELIEF_TOKEN_ABI = [
  "function getUserInfo(address) view returns (uint8 role, bool isActive, uint256 registeredAt)",
  "function getBeneficiaryAccount(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function getTokenStats() view returns (uint256, uint256, uint256, uint256)",
  "function getRoleStats() view returns (uint256, uint256, uint256, uint256)",
  "function assignRole(address, uint8) external",
  "function allocateTokens(address, uint256, uint256) external",
  "function registerMerchant(address, uint8, string) external",
  "function setUserLimits(address, uint256, uint256, uint256) external",
  "function spendTokens(address, uint256, string) external",
];

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      initContract();
      fetchUserRole();
    }
  }, [walletAddress]);

  const initContract = async () => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.warn("Contract address not configured");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      setContract(contractInstance);
    } catch (err) {
      console.error("Error initializing contract:", err);
    }
  };

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      const userInfo = await contractInstance.getUserInfo(walletAddress);
      const roleId = Number(userInfo[0]);

      const roleNames = ["None", "Admin", "Donor", "Beneficiary", "Merchant"];
      setUserRole(roleNames[roleId]);
    } catch (err) {
      console.error("Error fetching user role:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ReliefFund - Disaster Relief Platform</title>
        <meta
          name="description"
          content="Policy-Driven Transparent Disaster Relief Fund"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>🌍 ReliefFund</h1>
          <p className={styles.subtitle}>
            Transparent Disaster Relief Platform
          </p>

          <WalletConnect
            onConnect={(address) => setWalletAddress(address)}
            onDisconnect={() => {
              setWalletAddress(null);
              setUserRole(null);
            }}
          />
        </header>

        <main className={styles.main}>
          {walletAddress ? (
            <>
              {loading ? (
                <div className={styles.loading}>Loading your dashboard...</div>
              ) : userRole === "Admin" ? (
                <AdminDashboard address={walletAddress} contract={contract} />
              ) : userRole === "Beneficiary" ? (
                <BeneficiaryDashboard
                  address={walletAddress}
                  contract={contract}
                />
              ) : userRole === "None" ? (
                <div className={styles.statusCard}>
                  <h3>👤 No Role Assigned</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                  <p className={styles.info}>
                    Contact an admin to get assigned a role (Admin, Beneficiary,
                    or Merchant)
                  </p>
                </div>
              ) : userRole ? (
                <div className={styles.statusCard}>
                  <h3>🔄 Role: {userRole}</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                  <p className={styles.info}>
                    Dashboard for this role coming soon in next phase!
                  </p>
                </div>
              ) : (
                <div className={styles.statusCard}>
                  <h3>⏳ Loading Role...</h3>
                  <p>
                    Your wallet: {walletAddress.slice(0, 6)}...
                    {walletAddress.slice(-4)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className={styles.welcomeCard}>
              <h2>Welcome to ReliefFund Phase-1</h2>
              <p className={styles.welcomeSubtitle}>
                Relief Token System with User Controls
              </p>
              <p>Connect your wallet to get started</p>

              <div className={styles.features}>
                <div className={styles.feature}>
                  <span>🪙</span>
                  <h4>Stable Relief Token</h4>
                  <p>1 Token = 1 Relief Unit (e.g., 1 meal) - No volatility</p>
                </div>
                <div className={styles.feature}>
                  <span>🪙</span>
                  <h4>Stable Relief Token</h4>
                  <p>1 Token = 1 Relief Unit (e.g., 1 meal) - No volatility</p>
                </div>
                <div className={styles.feature}>
                  <span>🔒</span>
                  <h4>Per-User Token Caps</h4>
                  <p>Daily & weekly spending limits enforced on-chain</p>
                </div>
                <div className={styles.feature}>
                  <span>⏰</span>
                  <h4>Token Expiry</h4>
                  <p>Unspent tokens expire after set period</p>
                </div>
                <div className={styles.feature}>
                  <span>🏪</span>
                  <h4>Category-Restricted</h4>
                  <p>Valid only for Food, Medicine, Emergency supplies</p>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          <p>Phase-1: Relief Token & User Controls | Local Hardhat Network</p>
        </footer>
      </div>
    </>
  );
}
