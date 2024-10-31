import { AvatarBalance, handlerContext } from "generated";
import { zeroAddress } from "viem";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

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
  const [avatarBalance, avatar, token] = await Promise.all([
    context.AvatarBalance.get(balanceId),
    context.Avatar.get(avatarId),
    context.Token.get(tokenId),
  ]);
  if (avatarBalance) {
    let updated = {
      ...avatarBalance,
      lastCalculated: blockTimestamp,
    };
    if (token?.tokenType === "WrappedStaticToken") {
      updated.inflationaryValue = avatarBalance.inflationaryValue! + amount;
    } else {
      updated.balance = avatarBalance.balance + amount;
    }
    context.AvatarBalance.set(updated);
  } else {
    context.AvatarBalance.set({
      id: balanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      inflationaryValue: 0n,
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
