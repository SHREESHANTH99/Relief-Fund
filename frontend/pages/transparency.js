import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import PublicTransparencyDashboard from "@/components/PublicTransparencyDashboard";
import LandingNavbar from "@/components/LandingNavbar";
import styles from "@/styles/Home.module.css";

const RELIEF_TOKEN_ABI = [
  "function getTokenStats() view returns (uint256, uint256, uint256, uint256)",
  "function getRoleStats() view returns (uint256, uint256, uint256, uint256)",
  "function totalDonations() view returns (uint256)",
  "function totalTokensMinted() view returns (uint256)",
  "function roleCount(uint8) view returns (uint256)",
  "event TokensSpent(address indexed beneficiary, address indexed merchant, uint8 category, uint256 amount, string description, uint256 timestamp)",
  "event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp)",
];

export default function TransparencyPage() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initContract();
  }, []);

  const initContract = async () => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

      if (!contractAddress) {
        console.error("❌ Contract address not configured!");
        return;
      }

      // Use default provider (no wallet connection needed)
      const provider = new ethers.JsonRpcProvider("http://localhost:8545");

      const contractInstance = new ethers.Contract(
        contractAddress,
        RELIEF_TOKEN_ABI,
        provider
      );

      setContract(contractInstance);
      console.log("✅ Contract initialized for transparency view");
    } catch (err) {
      console.error("Error initializing contract:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = () => {
    // Redirect to main page
    window.location.href = "/";
  };

  return (
    <>
      <Head>
        <title>Public Transparency - ReliefFund</title>
        <meta
          name="description"
          content="View transparent relief fund statistics and impact"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <LandingNavbar onConnectClick={handleConnectWallet} />

        <main className={styles.main}>
          {loading ? (
            <div className={styles.loading}>Loading transparency data...</div>
          ) : contract ? (
            <PublicTransparencyDashboard contract={contract} />
          ) : (
            <div className={styles.statusCard}>
              <h3>⚠️ Unable to Load Contract</h3>
              <p>Please check your connection and try again.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
