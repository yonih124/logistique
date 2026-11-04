import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const uploadDirectory = path.resolve('uploads', 'profiles');
const formats = { jpeg: 'jpg', png: 'png', webp: 'webp' };

export async function enregistrerPhoto(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) throw Object.assign(new Error('La photo doit être au format JPG, PNG ou WebP'), { statusCode: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    throw Object.assign(new Error('La photo ne doit pas dépasser 2 Mo'), { statusCode: 400 });
  }
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${formats[match[1]]}`;
  await writeFile(path.join(uploadDirectory, filename), buffer, { flag: 'wx' });
  return `/uploads/profiles/${filename}`;
}

export async function supprimerPhoto(photoUrl) {
  if (!photoUrl?.startsWith('/uploads/profiles/')) return;
  const filename = path.basename(photoUrl);
  await unlink(path.join(uploadDirectory, filename)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}
