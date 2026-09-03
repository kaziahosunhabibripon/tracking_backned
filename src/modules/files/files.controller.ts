import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { promises as fs, createReadStream } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { RolesExact } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FilesService } from './files.service';

interface MulterFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * REST file endpoints (not GraphQL) — multipart upload + static serve.
 * The advertiser dashboard's Create Campaign form posts the icon here.
 */
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}

  @RolesExact(UserRole.ADVERTISER, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: MulterFileLike): Promise<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    return this.filesService.store(file);
  }

  @Public()
  @Get(':name')
  async serve(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^[a-zA-Z0-9._-]{1,80}$/.test(name)) {
      res.status(400).json({ message: 'Invalid filename' });
      return;
    }
    const uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
    const filePath = join(uploadDir, name);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
    } catch {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(filePath).pipe(res);
  }
}
