import Head from "next/head";
import { useState, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import FundStats from "@/components/FundStats";
import RoleDisplay from "@/components/RoleDisplay";
import styles from "@/styles/Home.module.css";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [userRole, setUserRole] = useState(null);

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
              <RoleDisplay
                address={walletAddress}
                onRoleLoaded={(role) => setUserRole(role)}
              />

              <FundStats />

              <div className={styles.statusCard}>
                <h3>✅ Phase-1 Setup Complete</h3>
                <p>
                  Connected to: {walletAddress.slice(0, 6)}...
                  {walletAddress.slice(-4)}
                </p>
                <p className={styles.info}>
                  Role-based navigation will be available in Phase-2
                </p>
              </div>
            </>
          ) : (
            <div className={styles.welcomeCard}>
              <h2>Welcome to ReliefFund</h2>
              <p>Connect your wallet to get started</p>
              <div className={styles.features}>
                <div className={styles.feature}>
                  <span>🔐</span>
                  <h4>Secure</h4>
                  <p>Blockchain-based transparency</p>
                </div>
                <div className={styles.feature}>
                  <span>👥</span>
                  <h4>Role-Based</h4>
                  <p>Admin, Donor, Beneficiary, Merchant</p>
                </div>
                <div className={styles.feature}>
                  <span>📊</span>
                  <h4>Auditable</h4>
                  <p>Track every donation & allocation</p>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          <p>Phase-1: Foundation Setup | Local Hardhat Network</p>
        </footer>
      </div>
    </>
  );
}
