/**
 * Inhalt des Telegram-Bots (@BotFather-Bot für Cold Traffic).
 *
 * Text, Button-Label und Ziel-URL stehen bewusst NUR hier — Änderungen am
 * Wording sind damit eine Ein-Datei-Änderung, ohne die Webhook-Logik in
 * `lib/telegram/` anzufassen.
 *
 * Formatierung: Die Nachricht wird mit `parse_mode: "HTML"` gesendet. Telegram
 * kennt in diesem Modus nur wenige Tags (<b>, <i>, <u>, <s>, <code>, <a>).
 * Der Text enthält sonst KEINE `<`, `>` oder `&` — deshalb ist kein Escaping
 * nötig. Wer neue Zeichen ergänzt, muss das prüfen.
 *
 * Länge: ~900 Zeichen, das Limit für Textnachrichten liegt bei 4096.
 */
export const TELEGRAM_BOT = {
  /** Whop-Checkout — einziges Ziel des einzigen Buttons. */
  joinUrl: "https://whop.com/capital-circle/capital-circle-academy/",
  /**
   * NUR reiner Text — `parse_mode` gilt ausschliesslich fuer `welcomeText`.
   * Inline-Keyboard-Labels rendert Telegram ungeparst, `<s>129€</s>` erschiene
   * also woertlich samt Tags. Ein durchgestrichener Preis ginge allein ueber
   * den Combining Stroke Overlay (U+0336) hinter jedem Zeichen — dessen Hoehe
   * und Staerke bestimmt aber die Systemschrift des Geraets, und die Linie sass
   * dort zu tief. Der Preis-Anker laeuft deshalb ueber das Wording.
   */
  buttonLabel: "JETZT BEITRETEN - 99€ statt 129€",
  welcomeText: `<b>🏆 Willkommen bei Capital Circle.</b>
⬇️ Über 1.000 Trader ausgebildet. Hier siehst du, wie du startest.

Ich mache aus dir einen profitablen Trader.
Die Erfolge meiner Community sprechen für sich. Ich weiß, was ich kann.

✅ Werde profitabel mit der Strategie, mit der ich selbst täglich am Markt handle (CAP Model)
✅ Live Trading mehrmals die Woche: in Echtzeit dabei sein
✅ Sonntag Macro Call: wöchentlicher Marktausblick
✅ Freitag Recap + täglicher Bias
✅ Aktive Community aus Leuten mit demselben Ziel

🎯 Monatliche Giveaways (Im wert von 200€)

🚀 Bald 129 € Monat. Jetzt beitreten und in 90 Tagen profitabel werden.

⚠️ Das Abo ist jederzeit kündbar. Keine versteckten Fristen. Keine Fallen.`,
} as const;
