import { createContext, useContext, useState, useCallback } from "react";

const ConciergeContext = createContext(null);

export function ConciergeProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [activeListing, setActiveListing] = useState(null);

  const openChat = useCallback((listing = null) => {
    if (listing) setActiveListing(listing);
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => setOpen(false), []);

  return (
    <ConciergeContext.Provider value={{ open, openChat, closeChat, activeListing, setActiveListing }}>
      {children}
    </ConciergeContext.Provider>
  );
}

export const useConcierge = () => useContext(ConciergeContext);
