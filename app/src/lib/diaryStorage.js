export const DIARY_PHOTO_BUCKET = 'diary-photos';

const toSafeString = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

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
  diaryId
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

    const blob = await dataUrlToBlob(source);
    const storagePath = createStoragePath({ familyId, diaryId, index, blob });
    const { error } = await client.storage
      .from(DIARY_PHOTO_BUCKET)
      .upload(storagePath, blob, {
        cacheControl: '3600',
        contentType: blob.type || 'image/jpeg',
        upsert: false
      });

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
    const { error } = await client.storage.from(DIARY_PHOTO_BUCKET).remove(chunk);
    if (error) throw error;
  }
};

export const createDiaryImageSignedUrl = async ({
  client,
  path,
  expiresIn = 1800
}) => {
  const rawPath = toSafeString(path).trim();
  const storagePath = getDiaryStoragePath(rawPath);
  if (!client || !rawPath) {
    return rawPath;
  }

  if (!storagePath) {
    return rawPath;
  }

  const { data, error } = await client.storage
    .from(DIARY_PHOTO_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data?.signedUrl || '';
};
