import { Profile } from "./types";
import { ProfileCache } from "./cache";

type GardenApiResponse = {
  status: string;
  data: {
    id: number;
    username: string;
    avatarUrl: string;
  }[];
};
type GardenProfile = {
  name: string;
  previewImage: string | undefined;
};
/**
 * This functions calls https://api.circles.garden/api/users?address[]=${address}
 * which returns a GardenApiResponse object.
 * GardenApiResponse contains an avatarUrl, which is also fetched and it's result is converted into a base 64 image.
 * @param {string} address - The address of the user.
 * @returns {Promise<{ data: GardenProfile | undefined; timeTaken: number }>} - The GardenProfile object and the time taken to fetch it.
 */
async function fetchGardenProfile(
  address: string
): Promise<{ data: GardenProfile | undefined; timeTaken: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `https://api.circles.garden/api/users?address[]=${address}`
    );
    const json = (await response.json()) as GardenApiResponse;

    if (json.status !== "ok" || json.data.length === 0) {
      return { data: undefined, timeTaken: Date.now() - startTime };
    }

    const user = json.data[0];
    let previewImage = undefined;
    if (user.avatarUrl !== null) {
      const avatarResponse = await fetch(user.avatarUrl, {
        headers: { accept: "*/*" },
      });
      const avatarArrayBuffer = await avatarResponse.arrayBuffer();
      const base64 = Buffer.from(avatarArrayBuffer).toString("base64");
      previewImage = `data:image/jpeg;base64,${base64}`;
    }

    const gardenProfile: GardenProfile = {
      name: user.username,
      previewImage,
    };

    return { data: gardenProfile, timeTaken: Date.now() - startTime };
  } catch (error) {
    console.error("Error fetching garden profile:", error);
    return { data: undefined, timeTaken: Date.now() - startTime };
  }
}

export async function getProfileMetadataFromGardenApi(
  address: string
): Promise<{ data: Profile | null } | null> {
  if (!address) {
    return null;
  }

  const cache = await ProfileCache.init(1);
  const cacheResult = await cache.read(address);

  if (cacheResult) {
    return { data: cacheResult.data };
  }

  const { data } = await fetchGardenProfile(address);
  if (!data) {
    return null;
  }

  // v1 did not had cidV0
  await cache.add(address, address, {
    name: data.name,
    previewImageUrl: data.previewImage,
  });

  return { data };
}
