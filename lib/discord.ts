/** Relativer Pfad zur OAuth-Weiterleitung (Server-Route baut die vollständige Discord-URL). */
export function getDiscordAuthUrl() {
  return "/api/discord/connect";
}
