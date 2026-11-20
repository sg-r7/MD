const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** True when both strings name the same resource, whatever their percent-encoding. */
export const sameResource = (a: string, b: string) => safeDecode(a) === safeDecode(b);

/**
 * Re-encodes the path of a URI the way Android's FileProvider does (every segment percent-encoded, only `_-!.~'()*`
 * left bare). Apps that hand us a content:// URI grant access to that exact string; once a router or bridge has
 * decoded it (spaces, Arabic letters), the string no longer matches the grant and the read is denied.
 */
export function canonicalUri(uri: string): string {
  const m = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)([^?#]*)(.*)$/i.exec(uri);
  if (!m) return uri;
  const [, scheme, authority, path, rest] = m;
  const encoded = path!.split('/').map((segment) => { try { return encodeURIComponent(decodeURIComponent(segment)); } catch { return segment; } }).join('/');
  return `${scheme}${authority}${encoded}${rest}`;
}
