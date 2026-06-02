import { S3Client } from './s3-client';
import { LocalStorage } from './local-storage';

export interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Key?: string;
  s3Secret?: string;
  s3Endpoint?: string;
}

export type StorageService = S3Client | LocalStorage;

export function createStorage(config: StorageConfig): StorageService {
  if (config.type === 's3') {
    return new S3Client(config);
  }
  return new LocalStorage({ basePath: config.localPath || './uploads' });
}

export { S3Client } from './s3-client';
export { LocalStorage } from './local-storage';
export * from './types';


