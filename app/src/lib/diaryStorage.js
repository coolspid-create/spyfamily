export const DIARY_PHOTO_BUCKET = 'diary-photos';
export const DIARY_IMAGE_MAX_DIMENSION = 1000;
export const DIARY_IMAGE_TARGET_BYTES = 450 * 1024;
export const DIARY_IMAGE_QUALITY = 0.72;
export const DIARY_SIGNED_URL_EXPIRES_IN = 1800;
export const DIARY_STORAGE_OPERATION_TIMEOUT_MS = 30000;

const CACHE_STORAGE_KEY = 'spy_diarySignedUrlCache';
const signedUrlCache = new Map();

const getPersistentStorage = () => (
  typeof localStorage === 'undefined' ? null : localStorage
);

const loadSignedUrlCache = () => {
  try {
    const storage = getPersistentStorage();
    if (!storage) return;

    const saved = storage.getItem(CACHE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(([key, value]) => {
          if (value && value.expiresAt > Date.now() + 60000) {
            signedUrlCache.set(key, value);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load signed URL cache from localStorage:', error);
  }
};

const saveSignedUrlCache = () => {
  try {
    const storage = getPersistentStorage();
    if (!storage) return;

    const activeEntries = [];
    signedUrlCache.forEach((value, key) => {
      if (value && value.expiresAt > Date.now() + 60000) {
        activeEntries.push([key, value]);
      }
    });
    if (activeEntries.length > 0) {
      storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(activeEntries));
    } else {
      storage.removeItem(CACHE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save signed URL cache to localStorage:', error);
  }
};

// Initialize cache from localStorage
loadSignedUrlCache();

let webpSupportPromise = null;

const toSafeString = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const withRejectingTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    globalThis.clearTimeout(timeoutId);
  });
};

export const isDirectImageSource = (value) => (
  /^(data:image\/|blob:|https?:\/\/|\/)/i.test(toSafeString(value).trim())
);

export const getDiaryStoragePath = (value) => {
  const raw = toSafeString(value).trim();
  if (!raw) return '';

  const stripBucketPrefix = (path) => {
    const normalized = toSafeString(path).trim().replace(/^\/+/, '');
    return normalized.startsWith(`${DIARY_PHOTO_BUCKET}/`)
      ? normalized.slice(DIARY_PHOTO_BUCKET.length + 1)
      : normalized;
  };

  if (!/^(data:image\/|blob:)/i.test(raw)) {
    try {
      const url = new URL(raw);
      const marker = `/storage/v1/object/`;
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex >= 0) {
        const objectPath = url.pathname.slice(markerIndex + marker.length);
        const pathWithoutAccessPrefix = objectPath.replace(/^(public|sign|authenticated)\//, '');
        if (pathWithoutAccessPrefix.startsWith(`${DIARY_PHOTO_BUCKET}/`)) {
          return decodeURIComponent(stripBucketPrefix(pathWithoutAccessPrefix));
        }
      }
    } catch {
      // Non-URL storage paths are handled below.
    }
  }

  if (isDirectImageSource(raw)) return '';
  return stripBucketPrefix(raw);
};

export const isStorageImagePath = (value) => {
  return Boolean(getDiaryStoragePath(value));
};

const dataUrlToBlob = async (imageSource) => {
  const response = await fetch(imageSource);
  if (!response.ok) throw new Error('이미지 파일을 읽을 수 없습니다.');
  return response.blob();
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(toSafeString(reader.result));
  reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
  reader.readAsDataURL(blob);
});

const canUseBrowserImageCompression = () => (
  typeof document !== 'undefined'
  && typeof Image !== 'undefined'
  && typeof URL !== 'undefined'
);

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

const supportsWebpOutput = () => {
  if (!canUseBrowserImageCompression()) return Promise.resolve(false);
  if (!webpSupportPromise) {
    webpSupportPromise = new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvas.toBlob((blob) => resolve(Boolean(blob && blob.type === 'image/webp')), 'image/webp', 0.8);
    });
  }
  return webpSupportPromise;
};

const loadBlobImage = (blob) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('이미지를 압축할 수 없습니다.'));
  };
  image.src = objectUrl;
});

export const compressDiaryImageBlob = async (blob, {
  maxDimension = DIARY_IMAGE_MAX_DIMENSION,
  targetBytes = DIARY_IMAGE_TARGET_BYTES,
  quality = DIARY_IMAGE_QUALITY
} = {}) => {
  if (!blob || !toSafeString(blob.type).startsWith('image/')) return blob;
  if (toSafeString(blob.type).toLowerCase().includes('gif')) return blob;
  if (!canUseBrowserImageCompression()) return blob;

  const image = await loadBlobImage(blob);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) return blob;

  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const useWebp = await supportsWebpOutput();
  const outputType = useWebp ? 'image/webp' : 'image/jpeg';

  if (scale === 1 && blob.type === outputType && blob.size <= targetBytes) {
    return blob;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: outputType === 'image/webp' });
  if (!context) return blob;

  context.drawImage(image, 0, 0, width, height);

  const qualitySteps = [quality, 0.64, 0.56, 0.48];
  let bestBlob = null;
  for (const nextQuality of qualitySteps) {
    const compressedBlob = await canvasToBlob(canvas, outputType, nextQuality);
    if (!compressedBlob) continue;
    if (!bestBlob || compressedBlob.size < bestBlob.size) {
      bestBlob = compressedBlob;
    }
    if (compressedBlob.size <= targetBytes) break;
  }

  if (!bestBlob) return blob;
  return bestBlob.size < blob.size ? bestBlob : blob;
};

export const compressDiaryImageFileToDataUrl = async (file) => {
  const compressedBlob = await compressDiaryImageBlob(file);
  return blobToDataUrl(compressedBlob);
};

const getBlobExtension = (blob) => {
  const mime = toSafeString(blob?.type, 'image/jpeg').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
};

const createStoragePath = ({ familyId, diaryId, index, blob }) => {
  const extension = getBlobExtension(blob);
  const randomName = `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;
  return `${familyId}/${diaryId}/${randomName}`;
};

export const uploadDiaryImagesToStorage = async ({
  client,
  images = [],
  familyId,
  diaryId,
  timeoutMs = DIARY_STORAGE_OPERATION_TIMEOUT_MS
}) => {
  const imageList = asArray(images);

  if (!client || !familyId || !diaryId) {
    return {
      imagePaths: imageList.filter(isStorageImagePath),
      displayImages: imageList,
      uploadedPaths: []
    };
  }

  const imagePaths = [];
  const uploadedPaths = [];

  for (const [index, imageSource] of imageList.entries()) {
    const source = toSafeString(imageSource).trim();
    if (!source) continue;

    if (isStorageImagePath(source)) {
      imagePaths.push(getDiaryStoragePath(source));
      continue;
    }

    if (!source.startsWith('data:image/') && !source.startsWith('blob:')) {
      continue;
    }

    const sourceBlob = await dataUrlToBlob(source);
    const blob = await compressDiaryImageBlob(sourceBlob);
    const storagePath = createStoragePath({ familyId, diaryId, index, blob });
    const { error } = await withRejectingTimeout(
      client.storage
        .from(DIARY_PHOTO_BUCKET)
        .upload(storagePath, blob, {
          cacheControl: '31536000',
          contentType: blob.type || 'image/jpeg',
          upsert: false
        }),
      timeoutMs,
      '다이어리 사진 업로드 시간이 초과되었습니다.'
    );

    if (error) throw error;
    imagePaths.push(storagePath);
    uploadedPaths.push(storagePath);
  }

  return {
    imagePaths,
    displayImages: imagePaths,
    uploadedPaths
  };
};

export const removeDiaryImagesFromStorage = async ({
  client,
  paths = [],
  chunkSize = 100
}) => {
  if (!client) return;

  const uniquePaths = [...new Set(asArray(paths).map(getDiaryStoragePath).filter(Boolean))];

  for (let index = 0; index < uniquePaths.length; index += chunkSize) {
    const chunk = uniquePaths.slice(index, index + chunkSize);
    const { error } = await withRejectingTimeout(
      client.storage.from(DIARY_PHOTO_BUCKET).remove(chunk),
      DIARY_STORAGE_OPERATION_TIMEOUT_MS,
      '다이어리 사진 정리 시간이 초과되었습니다.'
    );
    if (error) throw error;
  }
};

export const createDiaryImageSignedUrl = async ({
  client,
  path,
  expiresIn = DIARY_SIGNED_URL_EXPIRES_IN
}) => {
  const rawPath = toSafeString(path).trim();
  const storagePath = getDiaryStoragePath(rawPath);
  if (!client || !rawPath) {
    return rawPath;
  }

  if (!storagePath) {
    return rawPath;
  }

  const cacheKey = `${storagePath}:${expiresIn}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.url;
  }

  const { data, error } = await withRejectingTimeout(
    client.storage
      .from(DIARY_PHOTO_BUCKET)
      .createSignedUrl(storagePath, expiresIn),
    DIARY_STORAGE_OPERATION_TIMEOUT_MS,
    '다이어리 사진 주소 발급 시간이 초과되었습니다.'
  );

  if (error) throw error;
  const signedUrl = data?.signedUrl || '';
  if (signedUrl) {
    signedUrlCache.set(cacheKey, {
      url: signedUrl,
      expiresAt: Date.now() + (expiresIn * 1000)
    });
    saveSignedUrlCache();
  }
  return signedUrl;
};

export const getCachedDiaryImageSignedUrl = ({
  path,
  expiresIn = DIARY_SIGNED_URL_EXPIRES_IN
}) => {
  const storagePath = getDiaryStoragePath(path);
  if (!storagePath) return '';

  const cacheKey = `${storagePath}:${expiresIn}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.url;
  }

  return '';
};

export const clearCachedDiaryImageSignedUrl = ({
  path,
  expiresIn = DIARY_SIGNED_URL_EXPIRES_IN
}) => {
  const storagePath = getDiaryStoragePath(path);
  if (!storagePath) return;

  signedUrlCache.delete(`${storagePath}:${expiresIn}`);
  saveSignedUrlCache();
};
