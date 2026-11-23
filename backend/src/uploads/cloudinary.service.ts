import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly defaultFolder: string;

  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.defaultFolder = config.get<string>('CLOUDINARY_FOLDER') || 'QrCodeApp';
  }

  upload(buffer: Buffer, folder?: string): Promise<UploadApiResponse> {
    const uploadFolder = folder || this.defaultFolder;
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: uploadFolder, resource_type: 'image' }, (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
          resolve(result);
        })
        .end(buffer);
    });
  }

  async destroy(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      this.logger.warn(`Could not delete ${publicId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
