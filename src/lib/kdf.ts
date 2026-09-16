// The password never leaves this machine.
//
// Two different things are derived from it and only one is sent:
//
//   masterKey = PBKDF2(password, salt, iterations)   stays here
//   authHash  = PBKDF2(masterKey, password, 1)       sent, in place of the password
//   vaultKey  = HKDF(masterKey, "zyvro-vault-v1")    wraps a publisher's signing key
//
// The server stores a hash of authHash, so what it holds at rest is a hash of a
// hash, and it never sees anything it could turn into masterKey. Compromised,
// it can capture an authHash and impersonate that account to itself — an
// authenticator has to accept something — but it cannot unwrap what the vault
// key protects.
//
// The honest limit, because it would be easy to believe more than is true: this
// page's code comes from that same server, so a compromised one could serve a
// version that sends the password. End-to-end secrecy in a browser is only as
// good as the script the server just handed you. The guarantee is real in the
// desktop app, whose code is installed rather than delivered on every visit —
// which is where publishing, and so the signing key, lives.
//
// PBKDF2 rather than Argon2id on purpose: it is in WebCrypto and in Node with
// no dependency and no WebAssembly, so this file and the desktop's copy derive
// identically. Argon2id resists a GPU better; two clients that computed
// different keys would lock people out, which is worse than a weaker function.

export type KdfParams = {
  kdf_version: number
  kdf_iterations: number
  kdf_salt: string
}

const encoder = new TextEncoder()

function base64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let s = ""
  for (const b of view) s += String.fromCharCode(b)
  return btoa(s)
}

async function pbkdf2(secret: ArrayBuffer | string, salt: string, iterations: number): Promise<ArrayBuffer> {
  const material =
    typeof secret === "string"
      ? await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveBits"])
      : await crypto.subtle.importKey("raw", secret, "PBKDF2", false, ["deriveBits"])
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    material,
    256
  )
}

// deriveMasterKey is the expensive step, and the only one that touches the
// password directly. Everything else derives from what it returns.
export async function deriveMasterKey(password: string, params: KdfParams): Promise<ArrayBuffer> {
  return pbkdf2(password, params.kdf_salt, params.kdf_iterations)
}

// deriveAuthHash is what goes over the wire. One iteration, because its job is
// separation and not cost: the expense was already paid deriving the master
// key, and the server cannot run this backwards whatever the count.
export async function deriveAuthHash(password: string, params: KdfParams): Promise<string> {
  const master = await deriveMasterKey(password, params)
  return base64(await pbkdf2(master, password, 1))
}

// deriveVaultKey unwraps what a publisher keeps here. It is derived from the
// same master key as the auth hash and by a different path, so holding one says
// nothing about the other.
export async function deriveVaultKey(password: string, params: KdfParams): Promise<CryptoKey> {
  const master = await deriveMasterKey(password, params)
  const hkdf = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode("zyvro-vault-v1") },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}
