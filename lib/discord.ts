export function getDiscordAuthUrl() {
  const base = "https://discord.com/oauth2/authorize";
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    response_type: "code",
    scope: "identify email guilds.join",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord`,
  });
  return `${base}?${params.toString()}`;
}
