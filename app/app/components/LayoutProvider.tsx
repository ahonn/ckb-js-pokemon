"use client";

import { ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "../context";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  return (
    <ErrorBoundary>
      <ccc.Provider
        clientOptions={[
          {
            name: "CKB Testnet",
            client: new ccc.ClientPublicTestnet(),
          },
          {
            name: "CKB Mainnet",
            client: new ccc.ClientPublicMainnet(),
          },
        ]}
      >
        <AppProvider>
          <div className="flex h-dvh flex-col">
            <Navigation />
            <main className="relative flex grow flex-col items-center justify-around overflow-y-scroll pt-16 pb-4 bg-yellow-400">
              <div className="flex w-full grow flex-col items-center justify-center bg-yellow-400">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </AppProvider>
      </ccc.Provider>
    </ErrorBoundary>
  );
}