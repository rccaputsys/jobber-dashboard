import { createSecretKey } from "crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

const secret = createSecretKey(Buffer.from(process.env.APP_ENCRYPTION_SECRET!, "hex"));

export async function encryptText(plain: string): Promise<string> {
  const jwt = await new EncryptJWT({ v: plain })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .encrypt(secret);
  return jwt;
}

export async function decryptText(token: string): Promise<string> {
  const { payload } = await jwtDecrypt(token, secret);
  const v = payload?.v;
  if (typeof v !== "string") throw new Error("Invalid encrypted payload");
  return v;
}
