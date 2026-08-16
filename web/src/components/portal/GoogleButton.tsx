"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

/**
 * Minimal shape of the bits of Google Identity Services we call. The full
 * @types/google.accounts package would be one dependency for three methods.
 */
type GsiCredentialResponse = { credential?: string };
type GsiButtonOptions = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (res: GsiCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }): void;
          renderButton(parent: HTMLElement, options: GsiButtonOptions): void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Google caps the rendered button at 400px and ignores percentages. */
const MAX_WIDTH = 400;

export function googleSignInAvailable(): boolean {
  return CLIENT_ID.length > 0;
}

/**
 * Renders Google's own "Continue with Google" button and hands the resulting
 * ID token back through `onCredential`. Renders nothing at all when
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset, so the password form is still a
 * complete sign-in on an unconfigured deployment.
 */
export function GoogleButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: GsiButtonOptions["text"];
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Kept in a ref so re-rendering the parent (busy flags, errors) never tears
  // down and re-draws Google's iframe mid-click.
  const handler = useRef(onCredential);
  useEffect(() => {
    handler.current = onCredential;
  }, [onCredential]);

  const draw = useCallback(() => {
    const el = holder.current;
    if (!el || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (res) => {
        if (res.credential) handler.current(res.credential);
      },
    });
    // Strict mode mounts twice; without this the button stacks on itself.
    el.innerHTML = "";
    window.google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text,
      logo_alignment: "left",
      width: Math.min(el.offsetWidth || MAX_WIDTH, MAX_WIDTH),
    });
  }, [text]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={holder} className="flex justify-center [color-scheme:light]" />
    </>
  );
}

/** "or" rule between the Google button and the email form. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-navy-700" />
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">or</span>
      <span className="h-px flex-1 bg-navy-700" />
    </div>
  );
}
