export function isFreeMember(profile: {
  membership_tier?: string | null;
  is_paid?: boolean | null;
} | null): boolean {
  if (!profile) return false;
  return profile.membership_tier === "free" || !profile.is_paid;
}

export function isApprovedFreeMember(profile: {
  membership_tier?: string | null;
  is_paid?: boolean | null;
  application_status?: string | null;
} | null): boolean {
  if (!profile) return false;
  return (
    (profile.membership_tier === "free" || !profile.is_paid) &&
    profile.application_status === "approved"
  );
}
