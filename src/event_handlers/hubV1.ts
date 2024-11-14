import { Hub, PersonalCRC, Avatar, TrustRelation, Token } from "generated";
import { maxUint256 } from "viem";
import { incrementStats } from "../incrementStats";
import { handleTransfer } from "../common/handleTransfer";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

// ###############
// #### TOKEN ####
// ###############

Hub.Signup.contractRegister(async ({ event, context }) => {
  context.addPersonalCRC(event.params.token);
});

// ###############
// #### AVATAR ###
// ###############

Hub.OrganizationSignup.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.organization,
    avatarType: "OrganizationSignup",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 1,
    logIndex: event.logIndex,
    tokenId: undefined,
    cidV0: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
    lastMint: undefined,
    mintEndPeriod: undefined,
    lastDemurrageUpdate: undefined,
    trustedByN: 0,
    isVerified: false,
    profile_id: event.params.organization,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

Hub.Signup.handler(async ({ event, context }) => {
  const balanceId = makeAvatarBalanceEntityId(
    event.params.user,
    event.params.token
  );
  const avatarBalance = await context.AvatarBalance.get(balanceId);

  const avatarEntity: Avatar = {
    id: event.params.user,
    avatarType: "Signup",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 1,
    logIndex: event.logIndex,
    tokenId: event.params.token,
    cidV0: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: avatarBalance?.balance || 0n,
    lastMint: undefined,
    mintEndPeriod: undefined,
    lastDemurrageUpdate: undefined,
    trustedByN: 0,
    isVerified: false,
    profile_id: event.params.user,
  };

  context.Avatar.set(avatarEntity);

  const tokenEntity: Token = {
    id: event.params.token,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    version: 1,
    tokenType: "Signup",
    tokenOwner_id: event.params.user,
  };

  context.Token.set(tokenEntity);

  await incrementStats(context, "signups");
});

// ###############
// ## TRANSFERS ##
// ###############

PersonalCRC.Transfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: undefined,
      values: [event.params.amount],
      tokens: [event.srcAddress],
      transferType: "Transfer",
      avatarType: "Signup",
      version: 1,
    })
);

Hub.HubTransfer.handler(
  async ({ event, context }) => {}
    // await handleTransfer({
    //   event,
    //   context,
    //   operator: undefined,
    //   values: [event.params.amount],
    //   tokens: [event.srcAddress],
    //   transferType: "HubTransfer",
    //   avatarType: "Unknown",
    //   version: 1,
    // })
);

// ###############
// #### TRUST ####
// ###############

Hub.Trust.handler(async ({ event, context }) => {
  const trustId =
    `${event.params.user}${event.params.canSendTo}1`.toLowerCase();
  const oppositeTrustId =
    `${event.params.canSendTo}${event.params.user}1`.toLowerCase();
  const trustRelation = await context.TrustRelation.get(trustId);
  const oppositeTrustRelation = await context.TrustRelation.get(
    oppositeTrustId
  );
  if (event.params.limit === 0n) {
    // this is untrust
    if (trustRelation && trustRelation.version === 1) {
      context.TrustRelation.set({
        ...trustRelation,
        expiryTime: 0n,
        limit: 0n,
      });
    }
    if (oppositeTrustRelation && oppositeTrustRelation.version === 1) {
      context.TrustRelation.set({
        ...oppositeTrustRelation,
        isMutual: false,
      });
    }
    return;
  }
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual && oppositeTrustRelation.version === 1) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  if (!trustRelation) {
    const entity: TrustRelation = {
      id: trustId,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      logIndex: event.logIndex,
      version: 1,
      trustee_id: event.params.canSendTo,
      truster_id: event.params.user,
      expiryTime: maxUint256,
      limit: event.params.limit,
      isMutual,
    };

    context.TrustRelation.set(entity);
    await incrementStats(context, "trusts");
  }
});
