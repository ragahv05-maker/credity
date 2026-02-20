import bcrypt from 'bcryptjs';

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 8;

const pinStore = new Map<number, { pinHash: string; updatedAt: Date }>();

export function validatePinFormat(pin: string): boolean {
    return /^[0-9]+$/.test(pin) && pin.length >= MIN_PIN_LENGTH && pin.length <= MAX_PIN_LENGTH;
}

export async function setupPin(userId: number, pin: string): Promise<void> {
    if (!validatePinFormat(pin)) {
        throw new Error('PIN must be numeric and 4-8 digits long');
    }

    const pinHash = await bcrypt.hash(pin, 12);
    pinStore.set(userId, { pinHash, updatedAt: new Date() });
}

export async function verifyPin(userId: number, pin: string): Promise<boolean> {
    const record = pinStore.get(userId);
    if (!record) return false;
    return bcrypt.compare(pin, record.pinHash);
}

export function hasPin(userId: number): boolean {
    return pinStore.has(userId);
}
