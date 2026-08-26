// src/utils/imageUrl.js

// Handles both relative paths ("/media/listings/x.png") and absolute URLs
// ("http://localhost:8000/media/listings/x.png") returned by the API,
// so we never end up with a doubled-up domain.
export function getImageUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `http://localhost:8000${path}`;
}
