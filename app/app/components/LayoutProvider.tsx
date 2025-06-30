"use client";

import { ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "../context";
import { Navigation } from "./Navigation";

export function LayoutProvider({ children }: { children: ReactNode }) {
  return (
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
          <main className="relative flex grow flex-col items-center justify-around overflow-y-scroll pb-4">
            <div className="flex w-full grow flex-col items-center justify-center">
              {children}
            </div>
          </main>
        </div>
      </AppProvider>
    </ccc.Provider>
  );
}