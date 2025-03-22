import React, { createContext, useContext, useState, useEffect } from 'react';

type SidebarContextType = {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  expanded: false,
  toggle: () => {},
  setExpanded: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    setExpanded(prev => !prev);
  };

  // Close sidebar when clicking outside (but only on desktop)
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (expanded && !target.closest('.sidebar-container')) {
          setExpanded(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expanded]);

  return (
    <SidebarContext.Provider value={{ expanded, toggle, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}