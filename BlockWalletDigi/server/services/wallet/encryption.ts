import crypto from 'crypto';

export class WalletEncryptionService {
    private encryptionKey: string;

    constructor() {
        this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    }

    encrypt(plaintext: string, key?: string): string {
        const useKey = key || this.encryptionKey;
        const keyBuffer = Buffer.from(useKey.slice(0, 64), 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    decrypt(encrypted: string, key?: string): string {
        const useKey = key || this.encryptionKey;
        const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
        const keyBuffer = Buffer.from(useKey.slice(0, 64), 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    hashCredential(data: any): string {
        const canonical = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    generateShareToken(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    applySelectiveDisclosure(data: any, disclosedFields: string[]): any {
        if (disclosedFields.length === 0) return data;

        const result: any = {};
        for (const field of disclosedFields) {
            const parts = field.split('.');
            let source = data;
            let target = result;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    if (source && source[part] !== undefined) {
                        target[part] = source[part];
                    }
                } else {
                    if (source) source = source[part];
                    if (!target[part]) target[part] = {};
                    target = target[part];
                }
            }
        }

        return result;
    }
}

export const walletEncryptionService = new WalletEncryptionService();
