/* export async function getProfileMetadataFromIpfs(
  metadataDigest: string
): Promise<{ cidV0: string; data: Profile | null } | null> {
  if (!metadataDigest) {
    return null;
  }
  const slicedDigest = metadataDigest.slice(2, metadataDigest.length);

  const cache = await ProfileCache.init();
  const cacheResult = await cache.read(slicedDigest);

  if (cacheResult) {
    return cacheResult;
  }

  const cidV0 = uint8ArrayToCidV0(
    Uint8Array.from(Buffer.from(slicedDigest, "hex"))
  );

  const externalResponse = await fetch(`https://ipfs.io/ipfs/${cidV0}`);
  const externalData = await externalResponse.json();

  if (!externalData) {
    return { cidV0, data: null };
  }

  await cache.add(slicedDigest, cidV0, externalData as Profile);
  return { cidV0, data: externalData as Profile };
}
 */

import multihash from "multihashes";
import { Profile } from "./types";
import { ProfileCache } from "./cache";
import { Avatar, eventLog } from "generated";
import { uint8ArrayToCidV0 } from "./utils";

// Simple config with only needed values
const config = {
  maxImageSizeKB: 150,
  imageDimension: 256,
};

const IPFS_ENDPOINTS = [
  "https://cloudflare-ipfs.com/ipfs",
  "https://ipfs.io/ipfs",
  "https://gateway.pinata.cloud/ipfs",
];

async function validateImage(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    // Check file size
    if (buffer.byteLength > config.maxImageSizeKB * 1024) {
      console.error("Image size exceeds limit");
      return false;
    } else return true;
  } catch (error) {
    console.error("Failed to validate image:", error);
    return false;
  }
}

async function fetchFromEndpoint(
  endpoint: string,
  cidV0: string
): Promise<{ data: Profile | null; timeTaken: number }> {
  const startTime = performance.now();
  try {
    const response = await fetch(`${endpoint}/${cidV0}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as Profile | undefined;
    const timeTaken = performance.now() - startTime;

    // If there's an avatar URL, validate it

    if (data?.previewImageUrl) {
      const isValidImage = await validateImage(data.previewImageUrl);
      if (!isValidImage) {
        console.warn(`Invalid avatar image in profile from ${endpoint}`);
        data.previewImageUrl = undefined;
      }
    }

    console.log(`IPFS fetch from ${endpoint} took ${timeTaken.toFixed(2)}ms`);
    return { data: data as Profile, timeTaken };
  } catch (e) {
    const timeTaken = performance.now() - startTime;
    console.warn(
      `Failed to fetch from ${endpoint} (${timeTaken.toFixed(2)}ms):`,
      e
    );
    return { data: null, timeTaken };
  }
}

export async function getProfileMetadataFromIpfs(
  metadataDigest: string
): Promise<{ cidV0: string; data: Profile | null } | null> {
  if (!metadataDigest) {
    return null;
  }
  const slicedDigest = metadataDigest.slice(2, metadataDigest.length);

  const cache = await ProfileCache.init();
  const cacheResult = await cache.read(slicedDigest);

  if (cacheResult) {
    return cacheResult;
  }

  const cidV0 = uint8ArrayToCidV0(
    Uint8Array.from(Buffer.from(slicedDigest, "hex"))
  );

  // Try each endpoint until we get a successful response
  for (const endpoint of IPFS_ENDPOINTS) {
    const { data, timeTaken } = await fetchFromEndpoint(endpoint, cidV0);
    console.log(`IPFS fetch from ${endpoint} took ${timeTaken.toFixed(2)}ms`);
    if (data) {
      console.log("Adding IPFS data to cache", data);
      await cache.add(slicedDigest, cidV0, data);
      return { cidV0, data };
    }
  }

  console.error("Failed to fetch from all IPFS endpoints");
  return { cidV0, data: null };
}
