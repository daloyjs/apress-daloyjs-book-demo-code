/**
 * Fixed ES256 demo keypair for offline companion tests (Ch10+).
 * Not for production. Real deploys use an IdP JWKS URL with jwk().
 */
import { createJwtSigner, type JwkSet } from "@daloyjs/core";

/** Public JWKS consumed by jwk({ jwks }). */
export const DEMO_JWKS: JwkSet = {
  keys: [
    {
      kty: "EC",
      crv: "P-256",
      x: "regsZdxUNMxrDKczSyWGcbNnsnriNvPwwwSrj3wpHqk",
      y: "Oi3W5yg7P-UL_6QNs0I2XzC6vEvHuOS-B7Kadwir160",
      kid: "orders-demo-1",
      alg: "ES256",
      use: "sig",
    } as JsonWebKey,
  ],
};

/** Private JWK used only by test helpers to mint tokens. */
export const DEMO_PRIVATE_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "regsZdxUNMxrDKczSyWGcbNnsnriNvPwwwSrj3wpHqk",
  y: "Oi3W5yg7P-UL_6QNs0I2XzC6vEvHuOS-B7Kadwir160",
  d: "2CRtPJDoj6oaJMVFFGMbDSxBPrX3VVIJNt89ycc0_Zs",
  kid: "orders-demo-1",
  alg: "ES256",
} as JsonWebKey;

export const DEMO_ISSUER = "https://login.example.com/";
export const DEMO_AUDIENCE = "orders-api";

/**
 * Fixed 32-byte HMAC material for offline partner webhook signature tests
 * (Ch10/12/22 `httpSignatureAuth`). Production uses PARTNER_WEBHOOK_SECRET.
 */
export const DEMO_PARTNER_HMAC = new Uint8Array(32).fill(7);

/**
 * Structured mTLS headers that satisfy the capstone admin `clientCertAuth`
 * (nginx-style proxy headers; offline tests only — production uses real mTLS).
 */
export const DEMO_ADMIN_CERT_HEADERS = {
  "x-ssl-client-s-dn": "CN=orders-admin,O=example",
  "x-ssl-client-i-dn": "CN=orders-internal-ca,O=example",
  "x-ssl-client-verify": "SUCCESS",
} as const;

const signer = createJwtSigner({
  alg: "ES256",
  key: DEMO_PRIVATE_JWK,
  maxLifetimeSeconds: 3600,
  header: { kid: "orders-demo-1" },
});

/**
 * Mint a short-lived ES256 access token for companion tests.
 * @param scopes - Space-separated OAuth2 scope string (e.g. "orders:write orders:read").
 * @param sub - Subject / user id claim.
 */
export async function mintDemoToken(
  scopes: string,
  sub = "user_alice",
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signer.sign({
    sub,
    iss: DEMO_ISSUER,
    aud: DEMO_AUDIENCE,
    scope: scopes,
    iat: now,
    exp: now + 600,
  });
}
