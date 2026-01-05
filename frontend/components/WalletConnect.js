import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "@/styles/WalletConnect.module.css";

const WalletConnect = ({ onConnect, onDisconnect }) => {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if wallet is already connected
  useEffect(() => {
    checkIfWalletConnected();
  }, []);

  const checkIfWalletConnected = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const balance = await provider.getBalance(address);

          setAddress(address);
          setBalance(ethers.formatEther(balance));
          onConnect(address);
        }
      }
    } catch (err) {
      console.error("Error checking wallet connection:", err);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === "undefined") {
        throw new Error("Please install MetaMask or another Web3 wallet");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      // Check network
      const network = await provider.getNetwork();
      const expectedChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "31337";

      if (network.chainId.toString() !== expectedChainId) {
        throw new Error(
          `Please connect to Hardhat local network (Chain ID: ${expectedChainId})`
        );
      }

      setAddress(address);
      setBalance(ethers.formatEther(balance));
      onConnect(address);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setBalance(null);
    setError(null);
    onDisconnect();
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          checkIfWalletConnected();
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  if (address) {
    return (
      <div className={styles.walletInfo}>
        <div className={styles.addressBox}>
          <div>
            <div className={styles.label}>Connected Wallet</div>
            <div className={styles.address}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
          <div>
            <div className={styles.label}>Balance</div>
            <div className={styles.balance}>
              {parseFloat(balance).toFixed(4)} ETH
            </div>
          </div>
        </div>
        <button className={styles.disconnectButton} onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={styles.connectSection}>
      <button
        className={styles.connectButton}
        onClick={connectWallet}
        disabled={isConnecting}
      >
        {isConnecting ? "Connecting..." : "🔗 Connect Wallet"}
      </button>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default WalletConnect;
