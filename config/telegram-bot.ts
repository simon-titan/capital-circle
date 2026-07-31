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

/**
 * Simuliert „durchgestrichen" in einem Button-Label.
 *
 * Inline-Keyboard-Buttons rendert Telegram als REINEN Text — `parse_mode` gilt
 * nur für die Nachricht, `<s>` würde im Button wörtlich erscheinen. Einziger
 * Weg ist der Combining Long Stroke Overlay (U+0336) hinter jedem Zeichen.
 * Bewusst als Funktion statt als unsichtbare Zeichen im Quelltext, damit die
 * Zeile lesbar und kopierbar bleibt.
 */
const strikethrough = (text: string): string =>
  [...text].map((char) => `${char}\u0336`).join("");

export const TELEGRAM_BOT = {
  /** Whop-Checkout — einziges Ziel des einzigen Buttons. */
  joinUrl: "https://whop.com/capital-circle/capital-circle-academy/",
  buttonLabel: `JETZT BEITRETEN - 99€ Monatl. statt ${strikethrough("129€")}`,
  welcomeText: `<b>🏆 Willkommen bei Capital Circle.</b>
⬇️ Über 1.000 Trader ausgebildet. Hier siehst du, wie du startest.

Ich mache aus dir einen profitablen Trader.
Die Erfolge meiner Community sprechen für sich. Ich weiß, was ich kann.

✅ Werde profitabel — mit der Strategie, mit der ich selbst täglich am Markt handle (CAP Model)
✅ Live Trading mehrmals die Woche — in Echtzeit dabei sein
✅ Sonntag Macro Call — wöchentlicher Marktausblick
✅ Freitag Recap + täglicher Bias
✅ Aktive Community aus Leuten mit demselben Ziel

🎯 Monatliche Giveaways (Im wert von 200€)

🚀 Bald 129 € Monat. Jetzt beitreten und in 90 Tagen profitabel werden.

⚠️ Das Abo ist jederzeit kündbar. Keine versteckten Fristen. Keine Fallen.`,
} as const;
