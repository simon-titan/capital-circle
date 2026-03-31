import { redirect } from "next/navigation";

/** Selbstregistrierung ist deaktiviert; Konten werden über die Admin-Konsole angelegt. */
export default function RegisterPage() {
  redirect("/einsteig");
}
