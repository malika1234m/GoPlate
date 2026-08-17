import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterClient } from "@/components/portal/RegisterClient";
import { googleClientId } from "@/lib/google-auth";

export const metadata: Metadata = {
  title: "Create your account — GoPlate",
  description: "Start your free month and put your menu in 3D.",
};

// Same as /login: resolved per request so the client id is never build-inlined.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  // useSearchParams (?step=restaurant, set by Google sign-up) needs Suspense.
  return (
    <Suspense fallback={null}>
      <RegisterClient googleClientId={googleClientId()} />
    </Suspense>
  );
}
