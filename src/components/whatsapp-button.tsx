/**
 * "Chat on WhatsApp" — the shortcut the brief asks for (SPEC "WhatsApp
 * shortcut").
 *
 * The number comes from `WHATSAPP_NUMBER` via the public config, so the href is
 * a real `wa.me` deep link with the message pre-filled. When the number is not
 * configured the component renders **nothing at all**: a button that opens an
 * empty chat reads as a broken site, and there is no useful fallback link.
 */
import { DEFAULT_WHATSAPP_MESSAGE } from "~/lib/public-config";
import { useWhatsAppLink } from "~/lib/site-config";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./ui/button";

/** A speech bubble with a handset — the shape people read as "chat on WhatsApp". */
export function WhatsAppGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.9 9.9 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm0 17.96h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.14 8.14 0 0 1-1.25-4.35c0-4.5 3.67-8.16 8.2-8.16a8.15 8.15 0 0 1 8.18 8.17c0 4.5-3.67 8.18-8.18 8.18Zm4.5-6.12c-.25-.13-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12s-.64.8-.79.97c-.14.16-.29.18-.54.06a6.66 6.66 0 0 1-1.96-1.21 7.4 7.4 0 0 1-1.36-1.69c-.14-.25-.02-.38.1-.51.12-.12.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.77-1.83-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.42.06-.64.3-.22.23-.85.82-.85 2 0 1.19.86 2.33.98 2.5.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.46-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export function WhatsAppButton({
  message = DEFAULT_WHATSAPP_MESSAGE,
  label = "Chat on WhatsApp",
  variant = "whatsapp",
  size = "md",
  className,
  showGlyph = true,
}: {
  message?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  showGlyph?: boolean;
}) {
  const href = useWhatsAppLink(message);
  if (href === null) return null;

  return (
    <a
      href={href}
      // wa.me opens the WhatsApp app; a new tab keeps the site in place for
      // anyone using WhatsApp Web.
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses(variant, size, className)}
    >
      {showGlyph ? <WhatsAppGlyph /> : null}
      {label}
    </a>
  );
}
