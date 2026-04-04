/**
 * Which Supabase relation to use when loading a profile row.
 * Full `profiles` row (incl. fingerprint, egg_wallet, …) only for the viewer's own id;
 * peers use `profiles_peer` (public subset).
 */
export function profileSelectTable(
  profileUserId: string,
  viewerUserId: string | null | undefined
): 'profiles' | 'profiles_peer' {
  if (viewerUserId != null && viewerUserId !== '' && profileUserId === viewerUserId) {
    return 'profiles';
  }
  return 'profiles_peer';
}
