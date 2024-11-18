import { AvatarBalance, handlerContext } from "generated";
import { zeroAddress } from "viem";
import { makeAvatarBalanceEntityId } from "../utils";

export const updateAvatarBalance = async (
  context: handlerContext,
  amount: bigint,
  blockTimestamp: number,
  options: Partial<AvatarBalance>
) => {
  const { id: avatarId, token_id: tokenId } = options;
  if (avatarId === zeroAddress || !avatarId || !tokenId) {
    return;
  }
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const [avatarBalance, avatar] = await Promise.all([
    context.AvatarBalance.get(balanceId),
    context.Avatar.get(avatarId)
  ]);
  if (avatarBalance) {
    context.AvatarBalance.set({
      ...avatarBalance,
      balance: avatarBalance.balance + amount,
      computedValue: avatarBalance.computedValue + amount,
      lastCalculated: blockTimestamp,
    });
  } else {
    context.AvatarBalance.set({
      id: balanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      computedValue: 0n,
      lastCalculated: blockTimestamp,
    });
  }
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      balance: avatar.balance + amount,
    });
  }
};
