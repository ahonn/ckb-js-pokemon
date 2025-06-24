'use client';

import { ReactNode } from 'react';
import { ccc } from '@ckb-ccc/connector-react';

interface CccProviderProps {
  children: ReactNode;
}

export function CccProvider({ children }: CccProviderProps) {
  return (
    <ccc.Provider>
      {children}
    </ccc.Provider>
  );
}