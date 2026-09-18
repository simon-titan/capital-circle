import { redirect } from "next/navigation";

/** `/einstellungen` hat keinen eigenen Inhalt — das Profil ist der Einstieg. */
export default function EinstellungenIndex() {
  redirect("/einstellungen/profil");
}
