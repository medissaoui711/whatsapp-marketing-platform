import { promises as fs } from 'fs';
import path from 'path';

export interface LocalStorageConfig {
  basePath: string;
}

export class LocalStorage {
  private basePath: string;

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath;
  }

  private getFullPath(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType?: string
  ): Promise<string> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return key;
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async head(key: string): Promise<{ exists: boolean; size?: number; contentType?: string }> {
    const fullPath = this.getFullPath(key);
    try {
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
      };
    } catch {
      return { exists: false };
    }
  }

  async list(prefix: string): Promise<string[]> {
    const fullPrefix = this.getFullPath(prefix);
    const files: string[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.basePath, fullPath);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          files.push(relativePath);
        }
      }
    };

    try {
      await walk(fullPrefix);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return files;
  }

  async getUrl(key: string): Promise<string | null> {
    const exists = await this.exists(key);
    if (!exists) return null;
    return `/api/media/local/${encodeURIComponent(key)}`;
  }
}


