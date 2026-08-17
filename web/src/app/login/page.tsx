import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/portal/LoginClient";
import { googleClientId } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Sign in — GoPlate",
  description: "Sign in to manage your restaurant's 3D menu.",
};

// Read per request on the server, never inlined into the browser bundle, so
// setting the variable takes effect on restart without needing a fresh build.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // useSearchParams (the post-reset banner) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LoginClient googleClientId={googleClientId()} />
    </Suspense>
  );
}
