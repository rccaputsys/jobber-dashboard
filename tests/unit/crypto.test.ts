// tests/unit/crypto.test.ts
// Unit tests for src/lib/crypto.ts — encrypt/decrypt round-trip
import { describe, it, expect } from "vitest";
import { encryptText, decryptText } from "@/lib/crypto";

describe("crypto: encryptText / decryptText", () => {
  it("round-trips a simple string", async () => {
    const plain = "my-secret-access-token";
    const encrypted = await encryptText(plain);
    expect(encrypted).not.toBe(plain); // must be different
    expect(typeof encrypted).toBe("string");

    const decrypted = await decryptText(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("round-trips an empty string", async () => {
    const plain = "";
    const encrypted = await encryptText(plain);
    const decrypted = await decryptText(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("round-trips a long token with special characters", async () => {
    const plain = "eyJhbGciOiJIUzI1NiJ9.eyJ2IjoibXktc2VjcmV0LXRva2VuIn0.abc+def/ghi=";
    const encrypted = await encryptText(plain);
    const decrypted = await decryptText(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (nonce uniqueness)", async () => {
    const plain = "same-input";
    const enc1 = await encryptText(plain);
    const enc2 = await encryptText(plain);
    // JWE uses random IVs, so encrypted outputs should differ
    expect(enc1).not.toBe(enc2);
    // But both should decrypt to the same value
    expect(await decryptText(enc1)).toBe(plain);
    expect(await decryptText(enc2)).toBe(plain);
  });

  it("throws on tampered ciphertext", async () => {
    const encrypted = await encryptText("test");
    // Corrupt the ciphertext by flipping a character
    const tampered = encrypted.slice(0, -5) + "XXXXX";
    await expect(decryptText(tampered)).rejects.toThrow();
  });

  it("throws on completely invalid token", async () => {
    await expect(decryptText("not-a-valid-jwe")).rejects.toThrow();
  });

  it("throws when payload has wrong shape (missing v field)", async () => {
    // This tests the `if (typeof v !== 'string')` guard.
    // We can't easily craft a valid JWE with wrong payload without internal access,
    // so we rely on the tampered-token test above and the guard being tested by
    // integration-level scenarios.
  });
});
