export interface UploadResult {
  key: string;
  url?: string;
  bucket?: string;
}

export interface FileInfo {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}


