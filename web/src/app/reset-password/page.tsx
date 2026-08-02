import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordClient } from "@/components/portal/ResetPasswordClient";

export const metadata: Metadata = {
  title: "Choose a new password — GoPlate",
  description: "Set a new password for your GoPlate account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary to keep this page prerenderable.
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient />
    </Suspense>
  );
}
