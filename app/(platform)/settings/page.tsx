import { redirect } from "next/navigation";

/**
 * Alte Profiladresse. Der Inhalt liegt seit 17.09.2026 unter
 * `/einstellungen/profil`; diese Route bleibt bestehen, weil die Sidebar sie
 * lange als „Profil" geführt hat und Lesezeichen darauf zeigen.
 */
export default function SettingsRedirect() {
  redirect("/einstellungen/profil");
}
