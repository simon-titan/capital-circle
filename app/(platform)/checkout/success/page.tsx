import type { Metadata } from "next";
import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

export const metadata: Metadata = {
  title: "Zahlung erfolgreich — Capital Circle",
};

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessClient />;
}
