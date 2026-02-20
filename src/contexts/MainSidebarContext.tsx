'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useSidebarMobile } from '@/hooks/useSidebarMobile';

type MainSidebarContextValue = ReturnType<typeof useSidebarMobile>;

const MainSidebarContext = createContext<MainSidebarContextValue | null>(null);

export function MainSidebarProvider({ children }: { children: React.ReactNode }) {
  const value = useSidebarMobile();
  const memoized = useMemo(() => value, [value.isOpen, value.isMobile, value.openSidebar, value.closeSidebar, value.toggleSidebar]);
  return (
    <MainSidebarContext.Provider value={memoized}>
      {children}
    </MainSidebarContext.Provider>
  );
}

export function useMainSidebar(): MainSidebarContextValue {
  const ctx = useContext(MainSidebarContext);
  if (!ctx) {
    throw new Error('useMainSidebar must be used within MainSidebarProvider');
  }
  return ctx;
}

export function useMainSidebarOptional(): MainSidebarContextValue | null {
  return useContext(MainSidebarContext);
}
