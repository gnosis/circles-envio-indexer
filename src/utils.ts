import multihash from "multihashes";

/**
 * Converts a 32-byte UInt8Array back to a CIDv0 string by adding the hashing algorithm identifier.
 * @param {Uint8Array} uint8Array - The 32-byte hash digest.
 * @returns {string} - The resulting CIDv0 string (e.g., Qm...).
 */
export function uint8ArrayToCidV0(uint8Array: Uint8Array) {
  if (uint8Array.length !== 32) {
    throw new Error("Invalid array length. Expected 32 bytes.");
  }

  // Recreate the Multihash (prefix with SHA-256 code and length)
  const multihashBytes = multihash.encode(uint8Array, "sha2-256");

  // Encode the Multihash as a base58 CIDv0 string
  return multihash.toB58String(multihashBytes);
}

export interface Profile {
  name: string;
  description?: string;
  previewImageUrl?: string;
  imageUrl?: string;
}

export async function getProfileMetadataFromIpfs(
  cidV0: string
): Promise<Profile | null> {
  if (!cidV0) {
    return null;
  }
  const externalResponse = await fetch(`https://ipfs.io/ipfs/${cidV0}`);
  const externalData = await externalResponse.json();
  console.log(externalData, "metadata from IPFS <--");
  if (!externalData) {
    return null;
  }
  console.log(externalData, "external data");
  return externalData as Profile;
}
