import type { Metadata } from "next";
import { PlansClient } from "@/components/plans/PlansClient";

export const metadata: Metadata = {
  title: "Packages & Plans — GoPlate",
  description:
    "Start free with a full video menu and QR code, or go Pro for photoreal 3D dish models and AR. Simple pricing for restaurants of any size.",
};

export default function PlansPage() {
  return <PlansClient />;
}
