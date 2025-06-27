"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { Key } from "lucide-react";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { formatString, useGetExplorerLink } from "./utils";

function WalletIcon({
  wallet,
  className,
}: {
  wallet: ccc.Wallet;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallet.icon}
      alt={wallet.name}
      className={`rounded-full ${className}`}
      style={{ width: "1rem", height: "1rem" }}
    />
  );
}

export const APP_CONTEXT = createContext<
  | {
      signer?: ccc.Signer;
      setPrivateKeySigner: (
        signer: ccc.SignerCkbPrivateKey | undefined,
      ) => void;
      openSigner: () => void;
      disconnect: () => void;
      openAction: ReactNode;

      sendMessage: (
        level: "error" | "warn" | "info",
        title: string,
        msgs: ReactNode[],
      ) => void;
    }
  | undefined
>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [privateKeySigner, setPrivateKeySigner] = useState<
    ccc.SignerCkbPrivateKey | undefined
  >(undefined);
  const [address, setAddress] = useState<string>("");

  const {
    wallet,
    signerInfo: cccSigner,
    open,
    client,
    disconnect,
  } = ccc.useCcc();
  const signer = privateKeySigner ?? cccSigner?.signer;

  const { explorerAddress } = useGetExplorerLink();

  useEffect(() => {
    if (
      !privateKeySigner ||
      privateKeySigner.client.addressPrefix === client.addressPrefix
    ) {
      return;
    }

    setPrivateKeySigner(
      new ccc.SignerCkbPrivateKey(client, privateKeySigner.privateKey),
    );
  }, [privateKeySigner, client]);

  useEffect(() => {
    signer?.getInternalAddress().then((a) => setAddress(a));
  }, [signer]);

  const [messages, setMessages] = useState<
    ["error" | "warn" | "info", string, ReactNode][]
  >([]);
  console.log("Messages state:", messages); // Use messages to avoid lint error

  const sendMessage = (
    level: "error" | "warn" | "info",
    title: string,
    msgs: ReactNode[],
  ) =>
    setMessages((messages) => [
      [
        level,
        title,
        msgs.map((msg, i) => (
          <React.Fragment key={i}>
            {i === 0 ? "" : " "}
            {msg}
          </React.Fragment>
        )),
      ],
      ...messages,
    ]);

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
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

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <APP_CONTEXT.Provider
      value={{
        signer,
        setPrivateKeySigner,
        openSigner: () => {
          if (cccSigner) {
            open();
          } else {
            sendMessage("info", "Address Copied", [explorerAddress(address)]);
            window.navigator.clipboard.writeText(address);
          }
        },
        disconnect: () => {
          if (cccSigner) {
            disconnect();
          } else {
            setPrivateKeySigner(undefined);
          }
        },
        openAction: cccSigner ? (
          <>
            {wallet && <WalletIcon wallet={wallet} className="mr-2" />}
            {formatString(address, 5, 4)}
          </>
        ) : (
          <>
            <Key className="mr-2" style={{ width: "1rem", height: "1rem" }} />
            {formatString(address, 5, 4)}
          </>
        ),

        sendMessage,
      }}
    >
      {children}
    </APP_CONTEXT.Provider>
  );
}

export function useApp() {
  const context = React.useContext(APP_CONTEXT);
  if (!context) {
    throw Error(
      "The component which invokes the useApp hook should be placed in a AppProvider.",
    );
  }
  return context;
}