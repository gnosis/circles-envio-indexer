import multihash from "multihashes";
import { Profile } from "./types";
import { Avatar, eventLog } from "generated";

/**
 * Converts a 32-byte UInt8Array back to a CIDv0 string by adding the hashing algorithm identifier.
 * @param {Uint8Array} uint8Array - The 32-byte hash digest.
 * @returns {string} - The resulting CIDv0 string (e.g., Qm...).
 */
function uint8ArrayToCidV0(uint8Array: Uint8Array): string {
  if (uint8Array.length !== 32) {
    throw new Error("Invalid array length. Expected 32 bytes.");
  }

  // Recreate the Multihash (prefix with SHA-256 code and length)
  const multihashBytes = multihash.encode(uint8Array, "sha2-256");

  // Encode the Multihash as a base58 CIDv0 string
  return multihash.toB58String(multihashBytes);
}

export async function getProfileMetadataFromIpfs(
  metadataDigest: string
): Promise<{ cidV0: string; data: Profile | null } | null> {
  if (!metadataDigest) {
    return null;
  }
  const slicedDigest = metadataDigest.slice(2, metadataDigest.length);

  const cidV0 = uint8ArrayToCidV0(
    Uint8Array.from(Buffer.from(slicedDigest, "hex"))
  );

  const externalResponse = await fetch(`https://ipfs.io/ipfs/${cidV0}`);
  const externalData = await externalResponse.json();

  if (!externalData) {
    return { cidV0, data: null };
  }

  return { cidV0, data: externalData as Profile };
}

export function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

export function defaultAvatarProps(event: eventLog<any>) {
  return {
    id: "default",
    avatarType: "Unknown",
    tokenId: undefined,
    cidV0: undefined,
    profile_id: undefined,
    version: 0,
    //
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    logIndex: event.logIndex,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
    lastMint: undefined,
    trustsGivenCount: 0,
    trustsReceivedCount: 0,
    trustedByN: 0,
    isVerified: false,
  } as Avatar;
}