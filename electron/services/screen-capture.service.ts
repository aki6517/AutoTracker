import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { getEncryptionService } from './encryption.service.js';
import { getDatabase } from '../database/index.js';
import type { DbScreenshot } from '../database/types.js';

// 圧縮設定
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const JPEG_QUALITY = 80;
const TARGET_SIZE_KB = 200;

// サムネイル設定
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;
const THUMBNAIL_QUALITY = 60;

export interface CaptureMetadata {
  windowTitle?: string;
  url?: string;
  appName?: string;
}

export interface CaptureResult {
  id: string;
  filePath: string;
  thumbnailPath: string;
  capturedAt: string;
  metadata: CaptureMetadata;
  fileSize: number;
}

/**
 * スクリーンキャプチャサービス
 */
export class ScreenCaptureService {
  private screenshotsDir: string;

  constructor() {
    this.screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
  }

  /**
   * 画面をキャプチャして保存
   */
  async capture(entryId: string, metadata: CaptureMetadata = {}): Promise<CaptureResult> {
    // スクリーンショットを撮影
    const rawBuffer = await this.captureScreen();
    
    // 画像を圧縮
    const { compressed, thumbnail } = await this.compressImage(rawBuffer);
    
    // 保存パスを生成
    const timestamp = new Date();
    const dateDir = this.getDateDir(timestamp);
    const fileId = crypto.randomUUID();
    const filePath = path.join(dateDir, `${fileId}.enc`);
    const thumbnailPath = path.join(dateDir, `${fileId}_thumb.enc`);
    
    // 暗号化して保存
    const encryptionService = getEncryptionService();
    await encryptionService.encryptBufferToFile(compressed, filePath);
    await encryptionService.encryptBufferToFile(thumbnail, thumbnailPath);
    
    // メタデータをDBに保存
    const capturedAt = timestamp.toISOString();
    this.saveToDatabase(fileId, entryId, filePath, thumbnailPath, capturedAt, metadata);
    
    return {
      id: fileId,
      filePath,
      thumbnailPath,
      capturedAt,
      metadata,
      fileSize: compressed.length,
    };
  }

  /**
   * スクリーンショットを撮影
   */
  private async captureScreen(): Promise<Buffer> {
    try {
      const imgBuffer = await screenshot({ format: 'png' });
      return Buffer.isBuffer(imgBuffer) ? imgBuffer : Buffer.from(imgBuffer);
    } catch (error) {
      console.error('Failed to capture screen:', error);
      throw new Error('Screen capture failed. Please grant screen recording permission.');
    }
  }

  /**
   * 画像を圧縮
   */
  private async compressImage(buffer: Buffer): Promise<{ compressed: Buffer; thumbnail: Buffer }> {
    // メイン画像の圧縮
    let compressed = await sharp(buffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // ファイルサイズが大きすぎる場合は品質を下げる
    if (compressed.length > TARGET_SIZE_KB * 1024) {
      let quality = JPEG_QUALITY - 10;
      while (compressed.length > TARGET_SIZE_KB * 1024 && quality >= 40) {
        compressed = await sharp(buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toBuffer();
        quality -= 10;
      }
    }

    // サムネイルの生成
    const thumbnail = await sharp(buffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return { compressed, thumbnail };
  }

  /**
   * 日付ディレクトリパスを取得
   */
  private getDateDir(date: Date): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.screenshotsDir, dateStr);
  }

  /**
   * DBにメタデータを保存
   */
  private saveToDatabase(
    id: string,
    entryId: string,
    filePath: string,
    thumbnailPath: string,
    capturedAt: string,
    metadata: CaptureMetadata
  ): void {
    const db = getDatabase();
    db.prepare(
      `INSERT INTO screenshots (id, entry_id, file_path, thumbnail_path, is_blurred, captured_at, metadata)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).run(
      id,
      entryId,
      filePath,
      thumbnailPath,
      capturedAt,
      JSON.stringify(metadata)
    );
  }

  /**
   * スクリーンショットを取得（復号化）
   */
  async getScreenshot(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT file_path FROM screenshots WHERE id = ?').get(id) as { file_path: string } | undefined;
    
    if (!row) return null;
    
    try {
      const encryptionService = getEncryptionService();
      const decrypted = await encryptionService.decryptFile(row.file_path);
      return { data: decrypted, mimeType: 'image/jpeg' };
    } catch (error) {
      console.error('Failed to decrypt screenshot:', error);
      return null;
    }
  }

  /**
   * サムネイルを取得（復号化）
   */
  async getThumbnail(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT thumbnail_path FROM screenshots WHERE id = ?').get(id) as { thumbnail_path: string } | undefined;
    
    if (!row || !row.thumbnail_path) return null;
    
    try {
      const encryptionService = getEncryptionService();
      const decrypted = await encryptionService.decryptFile(row.thumbnail_path);
      return { data: decrypted, mimeType: 'image/jpeg' };
    } catch (error) {
      console.error('Failed to decrypt thumbnail:', error);
      return null;
    }
  }

  /**
   * エントリーに紐づくスクリーンショット一覧を取得
   */
  getByEntryId(entryId: string): DbScreenshot[] {
    const db = getDatabase();
    return db.prepare(
      'SELECT * FROM screenshots WHERE entry_id = ? ORDER BY captured_at ASC'
    ).all(entryId) as DbScreenshot[];
  }

  /**
   * スクリーンショットを削除
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const row = db.prepare('SELECT file_path, thumbnail_path FROM screenshots WHERE id = ?').get(id) as {
      file_path: string;
      thumbnail_path: string | null;
    } | undefined;
    
    if (!row) return false;
    
    // ファイルを削除
    try {
      await fs.promises.unlink(row.file_path);
      if (row.thumbnail_path) {
        await fs.promises.unlink(row.thumbnail_path);
      }
    } catch (error) {
      console.warn('Failed to delete screenshot files:', error);
    }
    
    // DBから削除
    const result = db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 古いスクリーンショットをクリーンアップ
   */
  async cleanup(retentionDays: number): Promise<number> {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString();

    // 削除対象を取得
    const oldScreenshots = db.prepare(
      'SELECT id, file_path, thumbnail_path FROM screenshots WHERE captured_at < ?'
    ).all(cutoffStr) as { id: string; file_path: string; thumbnail_path: string | null }[];

    let deletedCount = 0;
    for (const ss of oldScreenshots) {
      try {
        await fs.promises.unlink(ss.file_path);
        if (ss.thumbnail_path) {
          await fs.promises.unlink(ss.thumbnail_path);
        }
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete screenshot file: ${ss.file_path}`, error);
      }
    }

    // DBから削除
    db.prepare('DELETE FROM screenshots WHERE captured_at < ?').run(cutoffStr);

    // 空のディレクトリを削除
    await this.cleanupEmptyDirs();

    console.log(`Cleaned up ${deletedCount} screenshots older than ${retentionDays} days`);
    return deletedCount;
  }

  /**
   * 空のディレクトリを削除
   */
  private async cleanupEmptyDirs(): Promise<void> {
    try {
      const dirs = await fs.promises.readdir(this.screenshotsDir);
      for (const dir of dirs) {
        const dirPath = path.join(this.screenshotsDir, dir);
        const stat = await fs.promises.stat(dirPath);
        if (stat.isDirectory()) {
          const files = await fs.promises.readdir(dirPath);
          if (files.length === 0) {
            await fs.promises.rmdir(dirPath);
          }
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }
}

// シングルトンインスタンス
let screenCaptureService: ScreenCaptureService | null = null;

export function getScreenCaptureService(): ScreenCaptureService {
  if (!screenCaptureService) {
    screenCaptureService = new ScreenCaptureService();
  }
  return screenCaptureService;
}

