import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterClient } from "@/components/portal/RegisterClient";

export const metadata: Metadata = {
  title: "Create your account — GoPlate",
  description: "Start your free month and put your menu in 3D.",
};

export default function RegisterPage() {
  // useSearchParams (?step=restaurant, set by Google sign-up) needs Suspense.
  return (
    <Suspense fallback={null}>
      <RegisterClient />
    </Suspense>
  );
}
