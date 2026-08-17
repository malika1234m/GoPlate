import type { Metadata } from "next";
import { AccountClient } from "@/components/account/AccountClient";
import { googleClientId } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Your account & plan — GoPlate",
  description: "Sign in to manage your GoPlate subscription and billing.",
};

// Same as /login and /register: resolved per request, never build-inlined.
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return <AccountClient googleClientId={googleClientId()} />;
}
