import type { Metadata } from "next";
import { ForgotPasswordClient } from "@/components/portal/ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset your password — GoPlate",
  description: "Send yourself a link to choose a new GoPlate password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
