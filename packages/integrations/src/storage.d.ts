import { StorageConfig, UploadResult } from './types';
export declare function configureStorage(cfg: StorageConfig): void;
export declare function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;
export declare function deleteFile(key: string): Promise<boolean>;
export declare const storage: {
    upload: typeof uploadFile;
    delete: typeof deleteFile;
    configure: typeof configureStorage;
};


