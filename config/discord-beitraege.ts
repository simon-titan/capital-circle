/**
 * Discord-Beiträge der Mitglieder für „Ergebnisse aus der Capital Circle
 * Community" (`CommunityEinblicke` auf `/training` und `/call`).
 *
 * Stand 17.11.2026: 95 Screenshots aus dem Ordner „CC-Bewertungen" (WhatsApp,
 * 14.11.2026) plus zwei ältere Beiträge (`discord-01.png`, `discord-07.png`).
 * Acht frühere Bilder waren Dubletten der neuen Lieferung und sind entfernt.
 *
 * **Reihenfolge ist Absicht** (Wunsch Simon 17.11.2026): zuerst die Beiträge,
 * die eine Auszahlung zeigen (`auszahlung: true`), absteigend nach Summe
 * (Euro grob mit 1,15 in Dollar umgerechnet), danach alles Übrige nach Datum,
 * neueste zuerst. Die Wand legt die Bilder zeilenweise aus — die ersten
 * Einträge stehen also wirklich oben.
 *
 * Die Bilder stehen **unverändert** unter `public/community/` (Dateiname
 * `discord-<Datum des Beitrags>-<Nr. aus der Lieferung>.jpg`), mit Namen,
 * Avataren und Klarnamen auf Urkunden — wie alle Nachweise (siehe
 * `config/landing-membership.ts`). Das Einverständnis liegt beim Betreiber.
 * Der Ordner steht im Matcher von `proxy.ts` unter den Ausnahmen.
 */
export interface DiscordBeitrag {
  src: string;
  breite: number;
  hoehe: number;
  alt: string;
  /** Beitrag zeigt eine Auszahlung (Überweisung, Payout-Mail/-Zertifikat, Freigabe). */
  auszahlung?: boolean;
}

export const discordBeitraege: readonly DiscordBeitrag[] = [
  { src: "/community/discord-2026-04-25-90.jpg", breite: 1590, hoehe: 1068, auszahlung: true, alt: "Discord-Beitrag: Auszahlung von Apex Trader Funding über 15.000 $" },
  { src: "/community/discord-2026-10-31-21.jpg", breite: 1466, hoehe: 882, auszahlung: true, alt: "Discord-Beitrag: über 15.000 $ Auszahlungen im Oktober" },
  { src: "/community/discord-2026-10-17-36.jpg", breite: 1600, hoehe: 769, auszahlung: true, alt: "Discord-Beitrag: 8.500 $ Auszahlungen im Oktober" },
  { src: "/community/discord-2026-08-06-72.jpg", breite: 1600, hoehe: 695, auszahlung: true, alt: "Discord-Beitrag: drei Auszahlungen von Lucid Trading über 2.459 $, 1.277 $ und 1.182 $" },
  { src: "/community/discord-2026-04-15-91.jpg", breite: 1220, hoehe: 1542, auszahlung: true, alt: "Discord-Beitrag: bestandene Challenge und Auszahlung von The Trading Pit über 3.618,69 €" },
  { src: "/community/discord-2026-04-09-93.jpg", breite: 924, hoehe: 1564, auszahlung: true, alt: "Discord-Beitrag: bestandene Challenge und Auszahlung von The Trading Pit über 3.438,25 €" },
  { src: "/community/discord-2026-08-31-57.jpg", breite: 1022, hoehe: 944, auszahlung: true, alt: "Discord-Beitrag: Überweisung von Topstep über 2.500 $" },
  { src: "/community/discord-2026-10-23-32.jpg", breite: 624, hoehe: 888, auszahlung: true, alt: "Discord-Beitrag: Auszahlung von Topstep über 2.088 $ freigegeben" },
  { src: "/community/discord-2026-08-26-62.jpg", breite: 1154, hoehe: 884, auszahlung: true, alt: "Discord-Beitrag: Payout-Zertifikat von Lucid Trading über 2.000 $" },
  { src: "/community/discord-2026-09-09-44.jpg", breite: 966, hoehe: 874, auszahlung: true, alt: "Discord-Beitrag: Auszahlung von The Trading Pit über 1.704,49 €" },
  { src: "/community/discord-2026-11-03-19.jpg", breite: 538, hoehe: 878, auszahlung: true, alt: "Discord-Beitrag: Auszahlung über 1.856 $ freigegeben" },
  { src: "/community/discord-2026-11-04-15.jpg", breite: 852, hoehe: 892, auszahlung: true, alt: "Discord-Beitrag: Proof of Payout von Topstep über 1.469 $" },
  { src: "/community/discord-2026-04-14-92.jpg", breite: 1600, hoehe: 910, auszahlung: true, alt: "Discord-Beitrag: Dank an Emre mit Überweisung von Topstep über 1.250,31 €" },
  { src: "/community/discord-2026-10-22-31.jpg", breite: 1138, hoehe: 886, auszahlung: true, alt: "Discord-Beitrag: Payout-Zertifikat von Lucid Trading über 1.416 $" },
  { src: "/community/discord-2026-08-31-58.jpg", breite: 1160, hoehe: 944, auszahlung: true, alt: "Discord-Beitrag: Payout-Zertifikat von IQ Capital über 1.350 $" },
  { src: "/community/discord-2026-07-16-83.jpg", breite: 876, hoehe: 888, auszahlung: true, alt: "Discord-Beitrag: Auszahlung von Lucid Trading über 1.163,60 $ freigegeben" },
  { src: "/community/discord-2026-07-24-77.jpg", breite: 776, hoehe: 882, auszahlung: true, alt: "Discord-Beitrag: Auszahlung von Lucid Trading über 1.027,58 $ überwiesen" },
  { src: "/community/discord-2026-08-24-64.jpg", breite: 1330, hoehe: 938, auszahlung: true, alt: "Discord-Beitrag: Auszahlung über 968 $ überwiesen" },
  { src: "/community/discord-2026-10-28-23.jpg", breite: 1112, hoehe: 890, auszahlung: true, alt: "Discord-Beitrag: Payout-Zertifikat von Lucid Trading über 849 $ mit Dank an Emre" },
  { src: "/community/discord-2026-11-11-02.jpg", breite: 656, hoehe: 846, auszahlung: true, alt: "Discord-Beitrag: Auszahlungsanfrage bei IQ Capital über 770 $" },
  { src: "/community/discord-2026-09-26-41.jpg", breite: 1600, hoehe: 729, auszahlung: true, alt: "Discord-Beitrag: erste Auszahlung bei Lucid Trading beantragt, mit Dank an Emre" },
  { src: "/community/discord-2026-11-12-00.jpg", breite: 672, hoehe: 890, alt: "Discord-Beitrag: erste 150k-Challenge bei Topstep bestanden" },
  { src: "/community/discord-2026-11-12-01.jpg", breite: 570, hoehe: 700, alt: "Discord-Beitrag: Tages-PnL von über 4.300 $" },
  { src: "/community/discord-2026-11-12-07.jpg", breite: 1238, hoehe: 712, alt: "Discord-Beitrag: zwei Konten kurz vor der maximalen Auszahlung" },
  { src: "/community/discord-2026-11-11-03.jpg", breite: 834, hoehe: 608, alt: "Discord-Beitrag: Netto-PnL von 5.412,52 $" },
  { src: "/community/discord-2026-11-09-04.jpg", breite: 538, hoehe: 942, alt: "Discord-Beitrag: Apex-Evaluation bestanden" },
  { src: "/community/discord-2026-11-09-05.jpg", breite: 588, hoehe: 678, alt: "Discord-Beitrag: Tages-PnL von über 4.800 $" },
  { src: "/community/discord-2026-11-06-06.jpg", breite: 1238, hoehe: 1146, alt: "Discord-Beitrag: Challenge bestanden und Wochengewinn von 9.489 $" },
  { src: "/community/discord-2026-11-05-08.jpg", breite: 678, hoehe: 948, alt: "Discord-Beitrag: Kontostand auf einem Tradovate-Konto" },
  { src: "/community/discord-2026-11-05-09.jpg", breite: 1244, hoehe: 418, alt: "Discord-Beitrag: Wochengewinn von 7.787 $" },
  { src: "/community/discord-2026-11-05-10.jpg", breite: 664, hoehe: 932, alt: "Discord-Beitrag: Sitzungsgewinn von 3.941 $" },
  { src: "/community/discord-2026-11-05-14.jpg", breite: 1136, hoehe: 818, alt: "Discord-Beitrag: bester Tag mit zwei bestandenen Challenges" },
  { src: "/community/discord-2026-11-04-11.jpg", breite: 1086, hoehe: 498, alt: "Discord-Beitrag: Tagesgewinn von 312 $" },
  { src: "/community/discord-2026-11-04-12.jpg", breite: 1238, hoehe: 662, alt: "Discord-Beitrag: Trading-Kalender und Trade im Chart" },
  { src: "/community/discord-2026-11-04-13.jpg", breite: 662, hoehe: 934, alt: "Discord-Beitrag: Sitzungsgewinn von 1.958 $" },
  { src: "/community/discord-2026-11-04-16.jpg", breite: 708, hoehe: 532, alt: "Discord-Beitrag: Tagesgewinne auf mehreren Konten" },
  { src: "/community/discord-2026-11-04-17.jpg", breite: 1236, hoehe: 578, alt: "Discord-Beitrag: Wochengewinn von 6.485 $" },
  { src: "/community/discord-2026-11-04-20.jpg", breite: 878, hoehe: 890, alt: "Discord-Beitrag: drei Funded Accounts" },
  { src: "/community/discord-2026-11-03-18.jpg", breite: 674, hoehe: 888, alt: "Discord-Beitrag: weiterer Funded Account" },
  { src: "/community/discord-2026-11-02-26.jpg", breite: 1236, hoehe: 720, alt: "Discord-Beitrag: Trade-Analyse mit Journal" },
  { src: "/community/discord-2026-10-29-22.jpg", breite: 602, hoehe: 886, alt: "Discord-Beitrag: Kontostand von 6.802 $ auf einem Topstep-Konto" },
  { src: "/community/discord-2026-10-27-24.jpg", breite: 1076, hoehe: 878, alt: "Discord-Beitrag: 11.700 $ auf Funded Accounts" },
  { src: "/community/discord-2026-10-26-25.jpg", breite: 690, hoehe: 892, alt: "Discord-Beitrag: 1.570 $ auf neuem Funded Account" },
  { src: "/community/discord-2026-10-23-27.jpg", breite: 1386, hoehe: 886, alt: "Discord-Beitrag: erste Challenge bei Tradeify bestanden" },
  { src: "/community/discord-2026-10-23-28.jpg", breite: 1232, hoehe: 798, alt: "Discord-Beitrag: Trades einer Woche" },
  { src: "/community/discord-2026-10-22-29.jpg", breite: 666, hoehe: 880, alt: "Discord-Beitrag: vierter von fünf Gewinntagen bei Topstep" },
  { src: "/community/discord-2026-10-22-30.jpg", breite: 1214, hoehe: 738, alt: "Discord-Beitrag: Gewinn auf einem Funded Account" },
  { src: "/community/discord-2026-10-21-33.jpg", breite: 1310, hoehe: 840, alt: "Discord-Beitrag: Funded Account mit einem Trade bestanden" },
  { src: "/community/discord-2026-10-21-34.jpg", breite: 712, hoehe: 240, alt: "Discord-Beitrag: Tagesgewinne" },
  { src: "/community/discord-2026-10-21-35.jpg", breite: 682, hoehe: 884, alt: "Discord-Beitrag: 3.800 $ auf neuem Funded Account" },
  { src: "/community/discord-2026-10-21-38.jpg", breite: 1260, hoehe: 802, alt: "Discord-Beitrag: Gewinn auf dem Heimweg" },
  { src: "/community/discord-2026-10-09-37.jpg", breite: 1230, hoehe: 350, alt: "Discord-Beitrag: Gewinntage einer Woche" },
  { src: "/community/discord-2026-10-08-39.jpg", breite: 720, hoehe: 368, alt: "Discord-Beitrag: Tagesgewinne mit Dank an Emre" },
  { src: "/community/discord-2026-10-08-43.jpg", breite: 1234, hoehe: 240, alt: "Discord-Beitrag: realisierter Gewinn von 483 $" },
  { src: "/community/discord-2026-10-06-40.jpg", breite: 1134, hoehe: 868, alt: "Discord-Beitrag: Funded Account bei Lucid Trading" },
  { src: "/community/discord-2026-09-23-42.jpg", breite: 1248, hoehe: 1414, alt: "Discord-Beitrag: zwei Mitglieder mit demselben Trade" },
  { src: "/community/discord-2026-09-22-48.jpg", breite: 1240, hoehe: 688, alt: "Discord-Beitrag: Trade im Chart" },
  { src: "/community/discord-2026-09-08-45.jpg", breite: 1244, hoehe: 676, alt: "Discord-Beitrag: Gewinn von 501 $" },
  { src: "/community/discord-2026-09-08-46.jpg", breite: 1382, hoehe: 872, alt: "Discord-Beitrag: Gewinn von 770 $" },
  { src: "/community/discord-2026-09-07-47.jpg", breite: 668, hoehe: 904, alt: "Discord-Beitrag: neuer Funded Account bei Apex Trader Funding" },
  { src: "/community/discord-2026-09-07-54.jpg", breite: 1244, hoehe: 696, alt: "Discord-Beitrag: Gewinn auf einem Apex-Konto" },
  { src: "/community/discord-2026-09-05-49.jpg", breite: 844, hoehe: 858, alt: "Discord-Beitrag: Challenge bei The Trading Pit bestanden" },
  { src: "/community/discord-2026-09-04-50.jpg", breite: 1224, hoehe: 430, alt: "Discord-Beitrag: fünf Gewinntage in einer Woche" },
  { src: "/community/discord-2026-09-03-51.jpg", breite: 1232, hoehe: 720, alt: "Discord-Beitrag: Trade im Chart" },
  { src: "/community/discord-2026-09-03-52.jpg", breite: 1444, hoehe: 1336, alt: "Discord-Beitrag: zwei Mitglieder mit demselben Trade" },
  { src: "/community/discord-2026-09-02-53.jpg", breite: 1246, hoehe: 726, alt: "Discord-Beitrag: Trade im Chart" },
  { src: "/community/discord-2026-09-02-55.jpg", breite: 1248, hoehe: 500, alt: "Discord-Beitrag: Gewinne auf fünf Konten" },
  { src: "/community/discord-2026-09-02-60.jpg", breite: 1250, hoehe: 678, alt: "Discord-Beitrag: Gewinn von 528 $" },
  { src: "/community/discord-2026-08-31-56.jpg", breite: 1098, hoehe: 886, alt: "Discord-Beitrag: Tagesgewinn auf einem Topstep-Konto" },
  { src: "/community/discord-2026-08-28-59.jpg", breite: 1252, hoehe: 688, alt: "Discord-Beitrag: Gewinn von 1.511 $" },
  { src: "/community/discord-2026-08-27-61.jpg", breite: 1236, hoehe: 698, alt: "Discord-Beitrag: Tagesgewinn von 9.040 $ auf 16 Konten" },
  { src: "/community/discord-2026-08-27-66.jpg", breite: 1086, hoehe: 830, alt: "Discord-Beitrag: Trade im Chart" },
  { src: "/community/discord-2026-08-25-63.jpg", breite: 1526, hoehe: 894, alt: "Discord-Beitrag: zwei Challenges nach einem Monat bestanden" },
  { src: "/community/discord-2026-08-20-65.jpg", breite: 652, hoehe: 914, alt: "Discord-Beitrag: Trade im Chart" },
  { src: "/community/discord-2026-07-31-67.jpg", breite: 1008, hoehe: 566, alt: "Discord-Beitrag: Netto-PnL von 2.316 $" },
  { src: "/community/discord-2026-07-30-68.jpg", breite: 1008, hoehe: 260, alt: "Discord-Beitrag: Dank an Emre" },
  { src: "/community/discord-2026-07-30-69.jpg", breite: 1168, hoehe: 872, alt: "Discord-Beitrag: zehn Konten an einem Tag bestanden" },
  { src: "/community/discord-2026-07-29-70.jpg", breite: 1120, hoehe: 790, alt: "Discord-Beitrag: Gewinn von 1.111 $" },
  { src: "/community/discord-2026-07-28-71.jpg", breite: 886, hoehe: 584, alt: "Discord-Beitrag: Netto-PnL von 9.725 $" },
  { src: "/community/discord-2026-07-21-73.jpg", breite: 1228, hoehe: 844, alt: "Discord-Beitrag: Gewinn von 3.700 $" },
  { src: "/community/discord-2026-07-21-74.jpg", breite: 422, hoehe: 842, alt: "Discord-Beitrag: Tagesgewinn von 2.786 $ auf fünf Konten" },
  { src: "/community/discord-2026-07-20-75.jpg", breite: 578, hoehe: 1182, alt: "Discord-Beitrag: Netto-PnL von 10.786 $" },
  { src: "/community/discord-2026-07-17-76.jpg", breite: 1156, hoehe: 1082, alt: "Discord-Beitrag: Dank an Emre nach dem ersten Tag" },
  { src: "/community/discord-2026-07-16-78.jpg", breite: 1186, hoehe: 856, alt: "Discord-Beitrag: Gewinn von 11.555 $" },
  { src: "/community/discord-2026-07-16-79.jpg", breite: 1232, hoehe: 718, alt: "Discord-Beitrag: Netto-PnL von 6.320 $" },
  { src: "/community/discord-2026-07-16-80.jpg", breite: 1194, hoehe: 894, alt: "Discord-Beitrag: Funded Account bei Apex Trader Funding" },
  { src: "/community/discord-2026-07-15-81.jpg", breite: 950, hoehe: 886, alt: "Discord-Beitrag: nächste Challenge bestanden" },
  { src: "/community/discord-2026-07-14-82.jpg", breite: 1154, hoehe: 896, alt: "Discord-Beitrag: Challenge bei IQ Capital bestanden" },
  { src: "/community/discord-2026-07-13-89.jpg", breite: 860, hoehe: 848, alt: "Discord-Beitrag: Funding bei Topstep" },
  { src: "/community/discord-2026-07-10-84.jpg", breite: 1124, hoehe: 982, alt: "Discord-Beitrag: Gewinn von 4.572 $" },
  { src: "/community/discord-07.png", breite: 328, hoehe: 754, alt: "Discord-Beitrag: zwei Kontostände bei Tradovate" },
  { src: "/community/discord-2026-06-04-85.jpg", breite: 1260, hoehe: 1298, alt: "Discord-Beitrag: zwei bestandene Challenges" },
  { src: "/community/discord-2026-05-19-86.jpg", breite: 1170, hoehe: 956, alt: "Discord-Beitrag: Challenge bei IQ Capital bestanden" },
  { src: "/community/discord-2026-05-15-87.jpg", breite: 1328, hoehe: 896, alt: "Discord-Beitrag: erster Funded Account mit neuer Strategie" },
  { src: "/community/discord-2026-05-15-88.jpg", breite: 1162, hoehe: 924, alt: "Discord-Beitrag: erster Funded Account bei Apex Trader Funding" },
  { src: "/community/discord-2026-05-14-94.jpg", breite: 1600, hoehe: 541, alt: "Discord-Beitrag: Dank an Emre für Strategie und Psychologie" },
  { src: "/community/discord-01.png", breite: 848, hoehe: 791, alt: "Discord-Beitrag: Funded Account bei Lucid Trading nach drei Tagen" },
];
