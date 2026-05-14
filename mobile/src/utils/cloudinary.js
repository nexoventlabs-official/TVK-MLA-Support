/**
 * Insert a Cloudinary transformation into a delivery URL so we ship a small
 * thumbnail to the device instead of the full 1–2 MB original.
 *
 *   thumb('https://res.cloudinary.com/x/image/upload/v123/folder/file.png', 160)
 *   → 'https://res.cloudinary.com/x/image/upload/c_fit,w_160,h_160,q_auto,f_auto/v123/folder/file.png'
 *
 * If the URL isn't a Cloudinary URL (or already has a transformation), we
 * return it unchanged.
 */
export function thumb(url, size = 160) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  // Insert exactly once, immediately after '/upload/'.
  return url.replace(
    /\/upload\/(?!c_|w_|h_|f_|q_)/,
    `/upload/c_fit,w_${size},h_${size},q_auto,f_auto/`
  );
}
