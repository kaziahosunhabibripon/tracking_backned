import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

// SVG is intentionally excluded: it's servable as text/html-adjacent content
// and can embed <script>/event-handler payloads. GET /files/:name is public
// and unauthenticated, so an uploaded SVG would be a stored-XSS vector.
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export interface UploadedFileResult {
  /** Public path served by `GET /files/:name`. */
  url: string;
  /** Filename on disk (UUID + extension). */
  filename: string;
  /** Original filename as uploaded. */
  originalName: string;
  /** Bytes written. */
  size: number;
  /** Detected mime type. */
  mimeType: string;
}

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Local-disk storage under `UPLOAD_DIR` (defaults to `./uploads`).
   * Returns the public URL the frontend should put in `<img src>` —
   * the file is then served by `FilesController.serve` (or by Nest's
   * static asset middleware once it's wired).
   *
   * Filename collision is impossible (UUID) so concurrent uploads
   * never overwrite each other.
   */
  async store(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): Promise<UploadedFileResult> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported mime type: ${file.mimetype}. Allowed: ${[...ALLOWED_MIME].join(', ')}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `File too large (${file.size} > ${MAX_BYTES} bytes).`,
      );
    }

    const ext = this.safeExt(file.originalname, file.mimetype);
    const filename = `${randomUUID()}${ext}`;
    const uploadDir = this.uploadDir();
    await this.ensureDir(uploadDir);

    const target = join(uploadDir, filename);
    try {
      await fs.writeFile(target, file.buffer, { flag: 'wx' });
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to write upload: ${(err as Error).message}`,
      );
    }

    return {
      url: `/files/${filename}`,
      filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private safeExt(original: string, mime: string): string {
    const ext = extname(original).toLowerCase();
    if (ext && /^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
    const guess: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return guess[mime] ?? '.bin';
  }

  private uploadDir(): string {
    return this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }
}
