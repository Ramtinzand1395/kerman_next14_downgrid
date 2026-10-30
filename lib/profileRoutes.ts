export const PROFILE_STEPS = {
  profile: 1,
  favorites: 2,
  addresses: 3,
  comments: 4,
  orders: 5,
  appointments: 6,
  wallet: 8,
  loyalty: 9,
  spin: 10,
  conversations: 11,
} as const;

export type ProfileSection = keyof typeof PROFILE_STEPS;

export function profileRoute(
  section: ProfileSection,
  params: Record<string, string | null | undefined> = {},
) {
  const search = new URLSearchParams({ step: String(PROFILE_STEPS[section]) });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `/my-profile?${search.toString()}`;
}
