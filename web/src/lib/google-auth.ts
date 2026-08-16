import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * "Continue with Google" verification.
 *
 * The browser gets an ID token from Google Identity Services and posts it here;
 * we verify the signature against Google's public keys rather than calling
 * Google's tokeninfo endpoint, so a sign-in costs no outbound request after the
 * key set is cached. jose refreshes the JWKS on its own when Google rotates.
 */
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

/** Both spellings are valid `iss` values on a Google ID token. */
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

/** Google sign-in is optional: without a client id the button never renders. */
export function googleEnabled(): boolean {
  return googleClientId().length > 0;
}

export type GoogleProfile = { sub: string; email: string; name: string };

/**
 * Returns the verified profile, or null if the token is invalid, expired, meant
 * for a different app, or carries an unverified email. An unverified email must
 * be rejected: we link Google accounts to existing rows by email, so accepting
 * one would let anyone claim another owner's account.
 */
export async function verifyGoogleIdToken(
  credential: string
): Promise<GoogleProfile | null> {
  const audience = googleClientId();
  if (!audience) return null;

  try {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience,
    });

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (!sub || !email || !verified) return null;

    const name = typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : email.split("@")[0];

    return { sub, email, name };
  } catch {
    return null;
  }
}
