import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../utils/AppError.js';

const directory = path.resolve('uploads', 'photos_justification');
export async function saveJustificationImage(value) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value || '');
  if (!match) throw new AppError('Choisissez une image JPG, PNG ou WebP', 400);
  const data = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'jpeg' ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : match[1] === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || data.length > 2 * 1024 * 1024) throw new AppError('Image invalide ou supérieure à 2 Mo', 400);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  await writeFile(path.join(directory, filename), data, { flag: 'wx' });
  return `/uploads/photos_justification/${filename}`;
}
export async function removeJustificationImage(url) {
  await unlink(path.join(directory, path.basename(url)));
}
