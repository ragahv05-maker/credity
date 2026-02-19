import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordStrength } from '../dist/index.js';

test('validatePasswordStrength - Valid password', () => {
    const result = validatePasswordStrength('Valid1!Password');
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, []);
});

test('validatePasswordStrength - Too short', () => {
    const result = validatePasswordStrength('Short1!');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must be at least 8 characters long'));
});

test('validatePasswordStrength - Too long', () => {
    const longPassword = 'A'.repeat(129) + '1!a';
    const result = validatePasswordStrength(longPassword);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must not exceed 128 characters'));
});

test('validatePasswordStrength - Missing uppercase', () => {
    const result = validatePasswordStrength('valid1!password');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must contain at least one uppercase letter'));
});

test('validatePasswordStrength - Missing lowercase', () => {
    const result = validatePasswordStrength('VALID1!PASSWORD');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must contain at least one lowercase letter'));
});

test('validatePasswordStrength - Missing number', () => {
    const result = validatePasswordStrength('Valid!Password');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must contain at least one number'));
});

test('validatePasswordStrength - Missing special char', () => {
    const result = validatePasswordStrength('Valid1Password');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must contain at least one special character'));
});

test('validatePasswordStrength - Multiple errors', () => {
    const result = validatePasswordStrength('short');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must be at least 8 characters long'));
    // "short" is all lowercase, so missing uppercase, number, special char
    assert.ok(result.errors.includes('Password must contain at least one uppercase letter'));
    assert.ok(result.errors.includes('Password must contain at least one number'));
    assert.ok(result.errors.includes('Password must contain at least one special character'));
});

test('validatePasswordStrength - Empty string', () => {
    const result = validatePasswordStrength('');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('Password must be at least 8 characters long'));
    assert.ok(result.errors.includes('Password must contain at least one uppercase letter'));
    assert.ok(result.errors.includes('Password must contain at least one lowercase letter'));
    assert.ok(result.errors.includes('Password must contain at least one number'));
    assert.ok(result.errors.includes('Password must contain at least one special character'));
});
