import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ company_name: "LuxuryCharterKings", vip_discount: 10, whatsapp_number: "" });

  const refresh = useCallback(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <SettingsContext.Provider value={{ settings, refresh, setSettings }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
