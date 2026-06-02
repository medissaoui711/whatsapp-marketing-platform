import { initStorage } from '@repo/media/src/storage';
import { getConfig } from '@repo/config';

let initialized = false;

export function initAppStorage(): void {
  if (initialized) return;

  const config = getConfig();
  const storage = config.storage;

  initStorage({
    type: storage.type,
    localPath: storage.localPath,
    s3Bucket: storage.s3Bucket,
    s3Region: storage.s3Region,
    s3Key: storage.s3Key,
    s3Secret: storage.s3Secret,
    s3Endpoint: storage.s3Endpoint,
  });

  initialized = true;
}


