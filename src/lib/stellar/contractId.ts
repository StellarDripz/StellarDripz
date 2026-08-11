/**
 * Stellar contract ID validation utilities.
 *
 * Validates that a contract ID is a valid Stellar contract address
 * (starts with "C", 56 chars, valid base32 checksum).
 *
 * Audit finding F2: Contract ID input now validates checksum before submission.
 */
import * as StellarSdk from "@stellar/stellar-sdk";

/**
 * Validate a Stellar contract ID with checksum verification.
 * Returns true if the ID is a valid contract address.
 */
export function isValidContractId(id: string): boolean {
  if (!id || id.length !== 56) return false;
  if (id[0] !== "C") return false;
  try {
    // StrKey.decodeCheck performs base32 + CRC16-XModem checksum validation
    StellarSdk.StrKey.decodeContract(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Return a user-friendly error message if the contract ID is invalid.
 * Returns null if valid.
 */
export function getContractIdError(id: string): string | null {
  if (!id) return "Contract ID is required";
  if (id.length !== 56) return `Expected 56 characters, got ${id.length}`;
  if (id[0] !== "C") return "Contract ID must start with 'C'";
  if (!isValidContractId(id)) return "Invalid Stellar contract ID (checksum mismatch)";
  return null;
}
