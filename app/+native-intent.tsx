/**
 * Android "Open with" / iOS "Open in" deliver the PDF as a content:// or file:// URL.
 * Expo Router would treat that as an unknown route, so send it to the import screen instead.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (/^(content|file):\/\//i.test(path)) return `/open-pdf?uri=${encodeURIComponent(path)}`;
  return path;
}
