import { handlerContext } from "generated";
import { zeroAddress } from "viem";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

export const updateAvatarBalance = async (
  context: handlerContext,
  avatarId: string,
  tokenId: string,
  amount: bigint,
  version: number,
  isWrapped: boolean,
  inflationaryValue: bigint | undefined,
  lastCalculated: number | undefined
) => {
  if (avatarId === zeroAddress) {
    return;
  }
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const [avatarBalance, avatar] = await Promise.all([
    context.AvatarBalance.get(balanceId),
    context.Avatar.get(avatarId),
  ]);
  if (avatarBalance) {
    let updated = {
      ...avatarBalance,
      balance: avatarBalance.balance + amount,
    };
    if (inflationaryValue !== undefined) {
      updated.inflationaryValue =
        (avatarBalance.inflationaryValue || 0n) + inflationaryValue;
    }
    context.AvatarBalance.set(updated);
  } else {
    context.AvatarBalance.set({
      id: balanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      version,
      isWrapped,
      inflationaryValue,
      lastCalculated,
    });
  }
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      balance: avatar.balance + amount,
    });
  }
};
