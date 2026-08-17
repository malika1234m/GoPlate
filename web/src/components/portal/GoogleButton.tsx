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

/** Google caps the rendered button at 400px and ignores percentages. */
const MAX_WIDTH = 400;

/**
 * Renders Google's own "Continue with Google" button and hands the resulting
 * ID token back through `onCredential`. Renders nothing when `clientId` is
 * empty, so the password form is still a complete sign-in on a deployment
 * where Google sign-in was never configured.
 *
 * `clientId` arrives as a prop from the server rather than being read from
 * process.env here. Reading NEXT_PUBLIC_* in client code inlines the value at
 * BUILD time, so a deployment whose build came from cache keeps shipping the
 * old (empty) value even after the variable is set — the server picks the
 * change up on restart while the browser bundle silently does not. As a prop
 * it is resolved per request, so setting the variable is enough.
 */
export function GoogleButton({
  clientId,
  onCredential,
  text = "continue_with",
}: {
  clientId: string;
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
      client_id: clientId,
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
  }, [text, clientId]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  if (!clientId) return null;

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
