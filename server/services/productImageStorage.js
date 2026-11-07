const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const localUploadsDirectory = process.env.PRODUCT_IMAGE_LOCAL_DIRECTORY
  ? path.resolve(process.env.PRODUCT_IMAGE_LOCAL_DIRECTORY)
  : path.join(__dirname, '..', 'uploads');
const localUploadDirectory = path.join(localUploadsDirectory, 'products');

class InvalidProductImageError extends Error {}

function detectImageType(file) {
  const { buffer, mimetype, originalname } = file;
  const extension = path.extname(originalname || '').toLowerCase();
  let detected;

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    detected = { extension: '.png', mimeType: 'image/png', extensions: ['.png'] };
  } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detected = { extension: '.jpg', mimeType: 'image/jpeg', extensions: ['.jpg', '.jpeg'] };
  } else if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    detected = { extension: '.webp', mimeType: 'image/webp', extensions: ['.webp'] };
  }

  if (!detected || !detected.extensions.includes(extension) || mimetype !== detected.mimeType) {
    throw new InvalidProductImageError('Only valid PNG, JPEG, and WEBP image files are accepted.');
  }

  return detected;
}

function getStorageConfig() {
  const storageMode = process.env.PRODUCT_IMAGE_STORAGE;
  const production = process.env.NODE_ENV === 'production';

  if (storageMode === 'supabase' || (!storageMode && production)) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;

    if (!supabaseUrl || !serviceRoleKey || !bucket) {
      throw new Error('Production image storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(supabaseUrl);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      throw new Error('SUPABASE_URL must be a valid HTTPS URL.');
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('SUPABASE_URL must use HTTPS.');
    }

    return { type: 'supabase', supabaseUrl: supabaseUrl.replace(/\/+$/, ''), serviceRoleKey, bucket };
  }

  if (production && storageMode === 'local') {
    throw new Error('Local product-image storage is disabled in production. Configure persistent Supabase Storage.');
  }

  if (storageMode && storageMode !== 'local') {
    throw new Error('PRODUCT_IMAGE_STORAGE must be either "local" or "supabase".');
  }

  return { type: 'local' };
}

async function storeProductImage(file) {
  const imageType = detectImageType(file);
  const filename = `product_${crypto.randomUUID()}${imageType.extension}`;
  const config = getStorageConfig();

  if (config.type === 'local') {
    await fs.mkdir(localUploadDirectory, { recursive: true });
    await fs.writeFile(path.join(localUploadDirectory, filename), file.buffer, { flag: 'wx' });
    return `/uploads/products/${filename}`;
  }

  const objectPath = `products/${filename}`;
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      'Content-Type': imageType.mimeType,
      'x-upsert': 'false'
    },
    body: file.buffer
  });

  if (!response.ok) {
    throw new Error(`Persistent image storage rejected the upload (HTTP ${response.status}).`);
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodedPath}`;
}

module.exports = { detectImageType, storeProductImage, InvalidProductImageError };
