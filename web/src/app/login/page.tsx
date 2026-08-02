import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/portal/LoginClient";

export const metadata: Metadata = {
  title: "Sign in — GoPlate",
  description: "Sign in to manage your restaurant's 3D menu.",
};

export default function LoginPage() {
  // useSearchParams (the post-reset banner) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
