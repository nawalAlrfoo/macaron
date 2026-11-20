/**
 * Built-in images are stored in Firestore as "/src/assets/..." paths.
 * Prefix them with Vite's BASE_URL so they also work when the site is
 * hosted under a sub-path (e.g. sites.jortechjo.com/nawalalrfoo/macaron/).
 */
export function assetUrl(src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith('/src/assets/')) {
    return `${import.meta.env.BASE_URL}${src.slice(1)}`;
  }
  return src;
}

export const CURATED_AVATARS = [
  {
    id: 'cat',
    labelAr: 'قطة الباستيل',
    labelEn: 'Butter Kitten',
    url: '/src/assets/images/avatar_pastel_cat_1795110981779.jpg',
  },
  {
    id: 'bunny',
    labelAr: 'أرنب السحاب',
    labelEn: 'Sky Bunny',
    url: '/src/assets/images/avatar_pastel_bunny_1795110981761.jpg',
  },
  {
    id: 'bear',
    labelAr: 'دبدوب ناعم',
    labelEn: 'Blue Bear',
    url: '/src/assets/images/avatar_pastel_bear_1795110981545.jpg',
  },
  {
    id: 'cloud',
    labelAr: 'غيمة لطيفة',
    labelEn: 'Pastel Cloud',
    url: '/src/assets/images/avatar_pastel_cloud_1795110981213.jpg',
  },
];

export const WELCOME_BANNER_URL = '/src/assets/images/chat_welcome_banner_1795110981766.jpg';

/**
 * Compresses an uploaded avatar image file to a centered 160x160 JPEG data URL
 * guaranteed to stay well below Firestore field limits (< 50KB).
 */
export async function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 48000 && quality > 0.3) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a chat photo attachment preserving its aspect ratio (max 720px)
 * and fitting comfortably inside Firestore's 250,000 char field limit.
 */
export async function compressChatPhotoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxSide = 720;
        let width = img.width;
        let height = img.height;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 220000 && quality > 0.25) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 245000) {
          reject(new Error('Image still too large after compression'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
