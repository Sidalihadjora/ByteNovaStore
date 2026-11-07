export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

export function resolveImageUrl(image) {
  if (typeof image !== 'string' || !image.trim()) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const source = image.trim();
  if (/^(?:https?:\/\/|data:image\/|\/)/i.test(source)) {
    return source;
  }

  if (/^(?:[a-z]:[\\/]|\\\\|file:)/i.test(source)) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  return `/${source.replace(/^(?:\.\/)+/, '')}`;
}
