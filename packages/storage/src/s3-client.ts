import {
  S3Client as AwsS3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Key?: string;
  s3Secret?: string;
  s3Endpoint?: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export class S3Client {
  private client: AwsS3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    if (!config.s3Bucket || !config.s3Region) {
      throw new Error('s3_bucket and s3_region are required');
    }

    const options: any = {
      region: config.s3Region,
    };

    if (config.s3Key && config.s3Secret) {
      options.credentials = {
        accessKeyId: config.s3Key,
        secretAccessKey: config.s3Secret,
      };
    }

    if (config.s3Endpoint) {
      options.endpoint = config.s3Endpoint;
      options.forcePathStyle = true;
    }

    this.client = new AwsS3Client(options);
    this.bucket = config.s3Bucket;
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType?: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`No body in response for key: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as Readable;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getPresignedUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async head(key: string): Promise<{ exists: boolean; size?: number; contentType?: string }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      return {
        exists: true,
        size: response.ContentLength,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return { exists: false };
      }
      throw error;
    }
  }

  async list(prefix: string, maxKeys: number = 100): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.client.send(command);
    return response.Contents?.map(item => item.Key || '') || [];
  }

  async generatePresignedPost(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<{ url: string; fields: Record<string, string> }> {
    const url = await this.getPresignedUrl(key, expiresInSeconds);
    return { url, fields: {} };
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.head(key);
    return result.exists;
  }

  async getUrl(key: string): Promise<string | null> {
    return this.getPresignedUrl(key, 3600);
  }
}


