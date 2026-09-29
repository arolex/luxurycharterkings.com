import { useConcierge } from "@/context/ConciergeContext";
import { useSettings } from "@/context/SettingsContext";
import { waLink, waMessageFor } from "@/lib/api";

// FontAwesome-free inline WhatsApp glyph via lucide MessageCircle alternative
export const WhatsAppButton = () => {
  const { activeListing } = useConcierge();
  const { settings } = useSettings();
  const link = waLink(settings.whatsapp_number, waMessageFor(activeListing));

  if (!settings.whatsapp_number) return null;

  return (
    <a
      data-testid="floating-whatsapp-button"
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Concierge"
      className="fixed bottom-24 right-6 z-[55] h-12 w-12 rounded-full bg-[#25D366] text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform duration-300"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.02.61 3.9 1.66 5.47L2 22l4.79-1.55a9.9 9.9 0 0 0 5.25 1.5c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.77 13.88c-.24.68-1.4 1.3-1.93 1.34-.5.05-1.13.07-1.83-.11-.42-.11-.96-.32-1.66-.62-2.92-1.26-4.82-4.2-4.97-4.4-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.17.29.74 1.22 1.59 1.98 1.1.98 2.02 1.28 2.31 1.43.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.66-.14.27.1 1.7.8 1.99.95.29.14.48.22.55.34.07.12.07.68-.17 1.36Z" />
      </svg>
    </a>
  );
};
