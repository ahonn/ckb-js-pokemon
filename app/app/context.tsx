"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { Key } from "lucide-react";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { formatString, useGetExplorerLink } from "./utils";

// Type definitions
interface WalletState {
  signer?: ccc.Signer;
  address: string;
  isConnected: boolean;
}

interface MessageState {
  level: "error" | "warn" | "info";
  title: string;
  content: React.ReactNode;
  timestamp: number;
  id: string;
}

interface AppContextValue {
  // Wallet related state and actions
  wallet: WalletState;
  setPrivateKeySigner: (signer: ccc.SignerCkbPrivateKey | undefined) => void;
  openSigner: () => void;
  disconnect: () => void;
  openAction: React.ReactNode;

  // Message handling
  messages: MessageState[];
  sendMessage: (level: "error" | "warn" | "info", title: string, msgs: React.ReactNode[]) => void;
  clearMessage: (id: string) => void;
  clearAllMessages: () => void;
}

interface AppProviderProps {
  children: React.ReactNode;
}

// Create the context with undefined as default
const AppContext = createContext<AppContextValue | undefined>(undefined);

// Custom hook for using the app context with proper error handling
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      "useApp must be used within an AppProvider. Make sure your component is wrapped with AppProvider."
    );
  }
  return context;
}

// Helper component for wallet icons
function WalletIcon({
  wallet,
  className,
}: {
  wallet: ccc.Wallet;
  className?: string;
}) {
  return (
    <img
      src={wallet.icon}
      alt={wallet.name}
      className={`rounded-full ${className}`}
      style={{ width: "1rem", height: "1rem" }}
    />
  );
}

export function AppProvider({ children }: AppProviderProps) {
  // State management following React best practices
  const [privateKeySigner, setPrivateKeySigner] = useState<ccc.SignerCkbPrivateKey | undefined>(undefined);
  const [walletState, setWalletState] = useState<WalletState>({
    address: "",
    isConnected: false,
  });
  const [messages, setMessages] = useState<MessageState[]>([]);

  // CCC hooks
  const { wallet, signerInfo: cccSigner, open, client, disconnect } = ccc.useCcc();
  const { explorerAddress } = useGetExplorerLink();

  // Derived state - compute signer from available sources
  const signer = privateKeySigner ?? cccSigner?.signer;

  // Update wallet state when signer changes
  useEffect(() => {
    const updateWalletState = async () => {
      if (signer) {
        try {
          const address = await signer.getInternalAddress();
          setWalletState({
            signer,
            address,
            isConnected: true,
          });
        } catch {
          setWalletState(prev => ({ ...prev, isConnected: false }));
        }
      } else {
        setWalletState({
          address: "",
          isConnected: false,
        });
      }
    };

    updateWalletState();
  }, [signer]);

  // Handle private key signer updates when client changes
  useEffect(() => {
    if (!privateKeySigner || privateKeySigner.client.addressPrefix === client.addressPrefix) {
      return;
    }

    setPrivateKeySigner(
      new ccc.SignerCkbPrivateKey(client, privateKeySigner.privateKey)
    );
  }, [privateKeySigner, client]);

  // Message management functions
  const sendMessage = useCallback((
    level: "error" | "warn" | "info",
    title: string,
    msgs: React.ReactNode[]
  ) => {
    const newMessage: MessageState = {
      level,
      title,
      content: msgs.map((msg, i) => (
        <React.Fragment key={i}>
          {i === 0 ? "" : " "}
          {msg}
        </React.Fragment>
      )),
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9),
    };

    setMessages(prev => [newMessage, ...prev]);
  }, []);

  const clearMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Wallet action handlers
  const handleOpenSigner = useCallback(() => {
    if (cccSigner) {
      open();
    } else {
      sendMessage("info", "Address Copied", [explorerAddress(walletState.address)]);
      window.navigator.clipboard.writeText(walletState.address);
    }
  }, [cccSigner, open, sendMessage, explorerAddress, walletState.address]);

  const handleDisconnect = useCallback(() => {
    if (cccSigner) {
      disconnect();
    } else {
      setPrivateKeySigner(undefined);
    }
  }, [cccSigner, disconnect]);

  // Compute open action based on wallet state
  const openAction = React.useMemo(() => {
    if (cccSigner && wallet) {
      return (
        <>
          <WalletIcon wallet={wallet} className="mr-2" />
          {formatString(walletState.address, 5, 4)}
        </>
      );
    }
    return (
      <>
        <Key className="mr-2" style={{ width: "1rem", height: "1rem" }} />
        {formatString(walletState.address, 5, 4)}
      </>
    );
  }, [cccSigner, wallet, walletState.address]);

  // Global error handler
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = (() => {
        if (typeof event.reason === "object" && event.reason !== null) {
          const { name, message, stack, cause } = event.reason;
          return JSON.stringify({ name, message, stack, cause });
        }
        if (typeof event.reason === "string") {
          return event.reason;
        }
        return JSON.stringify(event);
      })();
      sendMessage("error", "Unknown error", [msg]);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, [sendMessage]);

  // Context value
  const contextValue: AppContextValue = {
    wallet: walletState,
    setPrivateKeySigner,
    openSigner: handleOpenSigner,
    disconnect: handleDisconnect,
    openAction,
    messages,
    sendMessage,
    clearMessage,
    clearAllMessages,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}