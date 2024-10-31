import { StandardTreasury } from "generated";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

StandardTreasury.CreateVault.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupMintSingle.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.group);
  if (avatar) {
    const balanceId = makeAvatarBalanceEntityId(
      event.params.group,
      event.params.id.toString()
    );
    const avatarBalance = await context.AvatarBalance.get(balanceId);
    if (avatarBalance) {
      context.AvatarBalance.set({
        ...avatarBalance,
        balance: avatarBalance.balance + event.params.value,
      });
    } else {
      context.AvatarBalance.set({
        id: makeAvatarBalanceEntityId(
          event.params.group,
          event.params.id.toString()
        ),
        token_id: event.params.id.toString(),
        avatar_id: event.params.group,
        balance: event.params.value,
        inflationaryValue: 0n,
        lastCalculated: 0,
      });
    }
  }
});

StandardTreasury.GroupMintBatch.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupRedeem.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupRedeemCollateralBurn.handler(
  async ({ event, context }) => {
    // TODO: Implement handler here
  }
);

StandardTreasury.GroupRedeemCollateralReturn.handler(
  async ({ event, context }) => {
    // TODO: Implement handler here
  }
);

// TODO: missing envent to redeeem from group
