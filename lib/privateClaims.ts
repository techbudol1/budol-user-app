import { buildPoseidon } from "circomlibjs";
import type { PrivateClaimNote, ShieldedPayoutNote, TradeSide } from "../types";
import { apiBaseURL } from "./runtimeConfig";
import { listShieldedPayoutNotes, saveShieldedPayoutNote } from "./shieldedPayouts";

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const TOKEN_DECIMALS = 18;
const TREE_LEVELS = 20;
const NOTE_STORAGE_PREFIX = "budol.privateClaimNote.";
const NOTE_BACKUP_VERSION = "budol-private-note-backup-v2";
const LEGACY_NOTE_BACKUP_VERSION = "budol-private-claim-backup-v1";
const NOTE_BACKUP_KDF_ITERATIONS = 210000;
type PoseidonInstance = Awaited<ReturnType<typeof buildPoseidon>>;

let poseidonPromise: Promise<PoseidonInstance> | null = null;

export type PrivateClaimCircuitInput = {
  root: string;
  resolvedOutcome: string;
  nullifierHash: string;
  marketId: string;
  outcome: string;
  amount: string;
  amountInverse: string;
  userSalt: string;
  secret: string;
  pathElements: string[];
  pathIndices: string[];
};

export type PrivateClaimProofBundle = {
  circuitInput: PrivateClaimCircuitInput;
  proof: unknown;
  publicSignals: unknown[];
  vk: unknown;
};

export type PrivateClaimNoteRecord = {
  note: PrivateClaimNote;
  tradeId: string;
};

export type PrivateClaimNoteBackup = {
  cipher: {
    ciphertext: string;
    iv: string;
    name: "AES-GCM";
  };
  exportedAt: string;
  kdf: {
    hash: "SHA-256";
    iterations: number;
    name: "PBKDF2";
    salt: string;
  };
  noteCount: number;
  shieldedNoteCount?: number;
  version: typeof NOTE_BACKUP_VERSION | typeof LEGACY_NOTE_BACKUP_VERSION;
};

type PrivateClaimNoteBackupPayload = {
  exportedAt: string;
  notes: PrivateClaimNoteRecord[];
  shieldedPayoutNotes?: ShieldedPayoutNote[];
  version: typeof NOTE_BACKUP_VERSION | typeof LEGACY_NOTE_BACKUP_VERSION;
};

export class PrivateClaimArtifactError extends Error {
  constructor(message = "Private claim proving artifacts are not available yet.") {
    super(message);
    this.name = "PrivateClaimArtifactError";
  }
}

function artifactBaseURL() {
  return apiBaseURL();
}

function artifactURL(file: string) {
  return `${artifactBaseURL()}/api/zk/private-claim/${file}`;
}

function poseidonInstance() {
  if (!poseidonPromise) {
    poseidonPromise = buildPoseidon();
  }
  return poseidonPromise;
}

function normalizeField(value: bigint): bigint {
  const result = value % FIELD_MODULUS;
  return result >= 0n ? result : result + FIELD_MODULUS;
}

function fieldString(value: bigint): string {
  return normalizeField(value).toString();
}

async function hashTextToField(value: string): Promise<bigint> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return normalizeField(BigInt(`0x${hex}`));
}

async function toField(value: string | number | bigint, name: string): Promise<bigint> {
  if (typeof value === "bigint") return normalizeField(value);
  if (typeof value === "number") return normalizeField(BigInt(value));
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  if (trimmed.startsWith("0x") || /^[0-9]+$/.test(trimmed)) {
    return normalizeField(trimmed.startsWith("0x") ? BigInt(trimmed) : BigInt(trimmed));
  }
  return hashTextToField(trimmed);
}

function toDecimalField(value: string | number | bigint, name: string): bigint {
  if (typeof value === "bigint") return normalizeField(value);
  if (typeof value === "number") return normalizeField(BigInt(value));
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return normalizeField(trimmed.startsWith("0x") ? BigInt(trimmed) : BigInt(trimmed));
}

function randomField(): bigint {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return normalizeField(BigInt(`0x${hex}`));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer as ArrayBuffer;
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array, iterations = NOTE_BACKUP_KDF_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      hash: "SHA-256",
      iterations,
      name: "PBKDF2",
      salt: arrayBufferFromBytes(salt),
    },
    material,
    { length: 256, name: "AES-GCM" },
    false,
    ["decrypt", "encrypt"],
  );
}

function isPrivateClaimNote(value: unknown): value is PrivateClaimNote {
  if (!value || typeof value !== "object") return false;
  const note = value as PrivateClaimNote;
  return ["amount", "leaf", "marketId", "nullifierHash", "outcome", "secret", "userSalt", "version"]
    .every(key => typeof note[key as keyof PrivateClaimNote] === "string" && String(note[key as keyof PrivateClaimNote]).trim() !== "");
}

async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await poseidonInstance();
  const field = poseidon.F;
  return normalizeField(BigInt(field.toString(poseidon(inputs.map(normalizeField)))));
}

function modInverse(value: bigint): bigint {
  let a = normalizeField(value);
  if (a === 0n) throw new Error("amount must be nonzero");
  let b = FIELD_MODULUS;
  let x0 = 1n;
  let x1 = 0n;
  while (b !== 0n) {
    const quotient = a / b;
    [a, b] = [b, a - quotient * b];
    [x0, x1] = [x1, x0 - quotient * x1];
  }
  return normalizeField(x0);
}

function decimalToTokenUnits(value: number | string, decimals = TOKEN_DECIMALS): string {
  const text = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error("trade amount must be a positive decimal number");
  }
  const [whole, fraction = ""] = text.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const units = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
  if (units <= 0n) {
    throw new Error("trade amount must be greater than zero");
  }
  return units.toString();
}

export function sideToPrivateClaimOutcome(side: TradeSide): "1" | "2" {
  return side === "no" ? "2" : "1";
}

export async function createPrivateClaimNote(input: {
  amount: number | string;
  pollId: string;
  side: TradeSide;
}): Promise<PrivateClaimNote> {
  const marketId = await toField(input.pollId, "pollId");
  const outcome = await toField(sideToPrivateClaimOutcome(input.side), "outcome");
  const amount = await toField(decimalToTokenUnits(input.amount), "amount");
  const userSalt = randomField();
  const secret = randomField();
  const leaf = await poseidonHash([marketId, outcome, amount, userSalt, secret]);
  const nullifierHash = await poseidonHash([secret, marketId]);

  return {
    amount: fieldString(amount),
    leaf: fieldString(leaf),
    marketId: fieldString(marketId),
    nullifierHash: fieldString(nullifierHash),
    outcome: fieldString(outcome),
    secret: fieldString(secret),
    userSalt: fieldString(userSalt),
    version: "budol-private-claim-v1",
  };
}

export function savePrivateClaimNote(tradeId: string, note: PrivateClaimNote) {
  try {
    window.localStorage.setItem(`${NOTE_STORAGE_PREFIX}${tradeId}`, JSON.stringify(note));
  } catch {
    // The server stores only the public commitment, so claim recovery requires this local note.
  }
}

export function loadPrivateClaimNote(tradeId: string): PrivateClaimNote | null {
  try {
    const raw = window.localStorage.getItem(`${NOTE_STORAGE_PREFIX}${tradeId}`);
    return raw ? JSON.parse(raw) as PrivateClaimNote : null;
  } catch {
    return null;
  }
}

export function listPrivateClaimNotes(): PrivateClaimNoteRecord[] {
  const notes: PrivateClaimNoteRecord[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(NOTE_STORAGE_PREFIX)) continue;
      const tradeId = key.slice(NOTE_STORAGE_PREFIX.length);
      const raw = window.localStorage.getItem(key);
      if (!tradeId || !raw) continue;
      const note = JSON.parse(raw) as PrivateClaimNote;
      if (isPrivateClaimNote(note)) {
        notes.push({ note, tradeId });
      }
    }
  } catch {
    return notes;
  }
  return notes.sort((a, b) => a.tradeId.localeCompare(b.tradeId));
}

export async function exportEncryptedPrivateClaimNotes(passphrase: string): Promise<PrivateClaimNoteBackup> {
  const cleanPassphrase = passphrase.trim();
  if (cleanPassphrase.length < 8) {
    throw new Error("Backup passphrase must be at least 8 characters.");
  }
  const notes = listPrivateClaimNotes();
  const shieldedPayoutNotes = listShieldedPayoutNotes();
  if (notes.length === 0 && shieldedPayoutNotes.length === 0) {
    throw new Error("No private claim or shielded payout notes are saved in this browser.");
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveBackupKey(cleanPassphrase, salt);
  const exportedAt = new Date().toISOString();
  const payload: PrivateClaimNoteBackupPayload = {
    exportedAt,
    notes,
    shieldedPayoutNotes,
    version: NOTE_BACKUP_VERSION,
  };
  const ciphertext = await crypto.subtle.encrypt(
    { iv: arrayBufferFromBytes(iv), name: "AES-GCM" },
    key,
    arrayBufferFromBytes(new TextEncoder().encode(JSON.stringify(payload))),
  );
  return {
    cipher: {
      ciphertext: base64FromBytes(new Uint8Array(ciphertext)),
      iv: base64FromBytes(iv),
      name: "AES-GCM",
    },
    exportedAt,
    kdf: {
      hash: "SHA-256",
      iterations: NOTE_BACKUP_KDF_ITERATIONS,
      name: "PBKDF2",
      salt: base64FromBytes(salt),
    },
    noteCount: notes.length,
    shieldedNoteCount: shieldedPayoutNotes.length,
    version: NOTE_BACKUP_VERSION,
  };
}

export async function importEncryptedPrivateClaimNotes(input: string | PrivateClaimNoteBackup, passphrase: string): Promise<number> {
  const cleanPassphrase = passphrase.trim();
  if (cleanPassphrase.length < 8) {
    throw new Error("Backup passphrase must be at least 8 characters.");
  }
  const backup = typeof input === "string" ? JSON.parse(input) as PrivateClaimNoteBackup : input;
  if (![NOTE_BACKUP_VERSION, LEGACY_NOTE_BACKUP_VERSION].includes(backup.version) || backup.cipher?.name !== "AES-GCM" || backup.kdf?.name !== "PBKDF2") {
    throw new Error("This is not a valid BudolPH private claim backup.");
  }
  const key = await deriveBackupKey(cleanPassphrase, bytesFromBase64(backup.kdf.salt), backup.kdf.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { iv: arrayBufferFromBytes(bytesFromBase64(backup.cipher.iv)), name: "AES-GCM" },
      key,
      arrayBufferFromBytes(bytesFromBase64(backup.cipher.ciphertext)),
    );
  } catch {
    throw new Error("Unable to decrypt backup. Check the passphrase and file.");
  }
  const payload = JSON.parse(new TextDecoder().decode(plaintext)) as PrivateClaimNoteBackupPayload;
  if (![NOTE_BACKUP_VERSION, LEGACY_NOTE_BACKUP_VERSION].includes(payload.version) || !Array.isArray(payload.notes)) {
    throw new Error("Backup payload is invalid.");
  }
  let imported = 0;
  for (const record of payload.notes) {
    if (!record.tradeId || !isPrivateClaimNote(record.note)) continue;
    savePrivateClaimNote(record.tradeId, record.note);
    imported += 1;
  }
  for (const note of payload.shieldedPayoutNotes || []) {
    if (!isShieldedPayoutNote(note)) continue;
    saveShieldedPayoutNote(note);
    imported += 1;
  }
  return imported;
}

function isShieldedPayoutNote(value: unknown): value is ShieldedPayoutNote {
  if (!value || typeof value !== "object") return false;
  const note = value as ShieldedPayoutNote;
  return ["blinding", "commitment", "createdAt", "denomination", "poolAddress", "secret", "tokenAddress", "tradeId", "version"]
    .every(key => typeof note[key as keyof ShieldedPayoutNote] === "string" && String(note[key as keyof ShieldedPayoutNote]).trim() !== "") &&
    typeof note.chainId === "number" &&
    note.version === "budol-shielded-payout-v1";
}

export async function buildPrivateClaimCircuitInput(note: PrivateClaimNote, leaves: string[], resolvedOutcome: string): Promise<PrivateClaimCircuitInput> {
  const leaf = toDecimalField(note.leaf, "note.leaf");
  let layer = leaves
    .filter(value => value.trim() !== "")
    .map((value, index) => toDecimalField(value, `leaves[${index}]`));
  let leafIndex = layer.findIndex(value => value === leaf);
  if (leafIndex < 0) {
    throw new Error("This trade's private commitment is not in the current market claim tree.");
  }
  const capacity = 2 ** TREE_LEVELS;
  if (layer.length > capacity) {
    throw new Error(`private claim tree supports at most ${capacity} leaves`);
  }

  const pathElements: string[] = [];
  const pathIndices: string[] = [];
  for (let level = 0; level < TREE_LEVELS; level += 1) {
    if (layer.length % 2 !== 0) layer.push(0n);
    const siblingIndex = leafIndex % 2 === 0 ? leafIndex + 1 : leafIndex - 1;
    pathElements.push(fieldString(layer[siblingIndex] ?? 0n));
    pathIndices.push(leafIndex % 2 === 0 ? "0" : "1");

    const nextLayer: bigint[] = [];
    for (let index = 0; index < layer.length; index += 2) {
      nextLayer.push(await poseidonHash([layer[index], layer[index + 1]]));
    }
    leafIndex = Math.floor(leafIndex / 2);
    layer = nextLayer;
  }

  const root = fieldString(layer[0] ?? 0n);
  const amount = toDecimalField(note.amount, "note.amount");
  return {
    amount: note.amount,
    amountInverse: fieldString(modInverse(amount)),
    marketId: note.marketId,
    nullifierHash: note.nullifierHash,
    outcome: note.outcome,
    pathElements,
    pathIndices,
    resolvedOutcome,
    root,
    secret: note.secret,
    userSalt: note.userSalt,
  };
}

export async function generatePrivateClaimProof(circuitInput: PrivateClaimCircuitInput): Promise<PrivateClaimProofBundle> {
  const wasmURL = artifactURL("private_winning_claim.wasm");
  const zkeyURL = artifactURL("private_winning_claim_final.zkey");
  const verificationKeyURL = artifactURL("verification_key.json");
  const [wasmResponse, zkeyResponse, verificationKeyResponse] = await Promise.all([
    fetch(wasmURL),
    fetch(zkeyURL),
    fetch(verificationKeyURL),
  ]);
  if (!wasmResponse.ok || !zkeyResponse.ok || !verificationKeyResponse.ok) {
    throw new PrivateClaimArtifactError();
  }
  const vk = await verificationKeyResponse.json();
  const snarkjs = await import("snarkjs") as {
    groth16: {
      fullProve: (input: PrivateClaimCircuitInput, wasmFile: string, zkeyFile: string) => Promise<{ proof: unknown; publicSignals: unknown[] }>;
    };
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInput, wasmURL, zkeyURL);
  return {
    circuitInput,
    proof,
    publicSignals,
    vk,
  };
}
