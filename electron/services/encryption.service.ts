import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// AES-256-GCM暗号化設定
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * 暗号化サービス
 * AES-256-GCMを使用してファイルを暗号化/復号化
 */
export class EncryptionService {
  private key: Buffer;

  constructor() {
    this.key = this.loadOrCreateKey();
  }

  /**
   * 暗号化キーをロードまたは新規作成
   */
  private loadOrCreateKey(): Buffer {
    const { app } = require('electron');
    const keyPath = path.join(app.getPath('userData'), '.encryption_key');

    try {
      if (fs.existsSync(keyPath)) {
        const keyHex = fs.readFileSync(keyPath, 'utf-8').trim();
        return Buffer.from(keyHex, 'hex');
      }
    } catch (error) {
      console.warn('Failed to load existing key, creating new one:', error);
    }

    // 新しいキーを生成
    const newKey = crypto.randomBytes(KEY_LENGTH);
    
    // キーを保存
    try {
      fs.writeFileSync(keyPath, newKey.toString('hex'), { mode: 0o600 });
    } catch (error) {
      console.error('Failed to save encryption key:', error);
      throw new Error('Failed to initialize encryption key');
    }

    return newKey;
  }

  /**
   * データを暗号化
   */
  encrypt(data: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // フォーマット: [IV (12 bytes)] [Auth Tag (16 bytes)] [Encrypted Data]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * データを復号化
   */
  decrypt(encryptedData: Buffer): Buffer {
    if (encryptedData.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const iv = encryptedData.subarray(0, IV_LENGTH);
    const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /**
   * ファイルを暗号化して保存
   */
  async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    const data = await fs.promises.readFile(inputPath);
    const encrypted = this.encrypt(data);
    
    // 出力ディレクトリを作成
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, encrypted);
  }

  /**
   * 暗号化ファイルを復号化して読み込み
   */
  async decryptFile(encryptedPath: string): Promise<Buffer> {
    const encryptedData = await fs.promises.readFile(encryptedPath);
    return this.decrypt(encryptedData);
  }

  /**
   * バッファを暗号化してファイルに保存
   */
  async encryptBufferToFile(buffer: Buffer, outputPath: string): Promise<void> {
    const encrypted = this.encrypt(buffer);
    
    // 出力ディレクトリを作成
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, encrypted);
  }
}

// シングルトンインスタンス
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
}

