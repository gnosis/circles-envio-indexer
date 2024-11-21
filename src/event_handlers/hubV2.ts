import {
  ERC20Lift,
  HubV2,
  Avatar,
  TrustRelation,
  NameRegistry,
  SafeAccount,
} from "generated";
import { toBytes, bytesToBigInt, parseEther, getAddress } from "viem";
import { incrementStats } from "../incrementStats";
import { getProfileMetadataFromIpfs } from "../utils";
import { Profile } from "../types";
import { handleTransfer } from "../common/handleTransfer";

// ###############
// #### TOKEN ####
// ###############

ERC20Lift.ERC20WrapperDeployed.contractRegister(
  async ({ event, context }) => {
    context.addWrappedERC20(event.params.erc20Wrapper);
  },
  { preRegisterDynamicContracts: true }
);

ERC20Lift.ERC20WrapperDeployed.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      wrappedTokenId: event.params.erc20Wrapper,
    });
  }
  context.Token.set({
    id: event.params.erc20Wrapper,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    version: 2,
    tokenType:
      event.params.circlesType === 0n
        ? "WrappedDemurrageToken"
        : "WrappedStaticToken",
    tokenOwner_id: event.params.avatar,
  });
});

// ###############
// #### AVATAR ###
// ###############

HubV2.RegisterHuman.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      avatarType: "RegisterHuman",
      version: 2,
      tokenId: bytesToBigInt(toBytes(event.params.avatar)).toString(),
      trustedByN: 0,
    });
  } else {
    const avatarEntity: Avatar = {
      id: event.params.avatar,
      avatarType: "RegisterHuman",
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      invitedBy: undefined,
      version: 2,
      logIndex: event.logIndex,
      tokenId: bytesToBigInt(toBytes(event.params.avatar)).toString(),
      cidV0: undefined,
      transactionIndex: event.transaction.transactionIndex,
      wrappedTokenId: undefined,
      balance: 0n,
      lastMint: undefined,
      mintEndPeriod: undefined,
      lastDemurrageUpdate: undefined,
      trustedByN: 0,
      isVerified: false,
      profile_id: event.params.avatar,
    };

    context.Avatar.set(avatarEntity);
    await incrementStats(context, "signups");
  }
});

HubV2.RegisterHuman.contractRegister(
  async ({ event, context }) => {
    context.addSafeAccount(event.params.avatar);
  },
  { preRegisterDynamicContracts: true }
);

SafeAccount.ExecutionSuccess.handlerWithLoader({
  loader: async ({ event, context }) => {
    let transfer = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return { transfer: transfer[0] };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transfer } = loaderReturn;

    if (transfer) {
      context.Transfer.set({
        ...transfer,
        safeTxHash: event.params.txHash,
      });
    }
  },
});

HubV2.RegisterOrganization.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.organization,
    avatarType: "RegisterOrganization",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 2,
    logIndex: event.logIndex,
    tokenId: bytesToBigInt(toBytes(event.params.organization)).toString(),
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

  context.Profile.set({
    id: event.params.organization,
    description: "",
    previewImageUrl: "",
    imageUrl: "",
    name: event.params.name,
    symbol: "",
  });
  await incrementStats(context, "signups");
});

HubV2.RegisterGroup.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.group);

  if (!avatar) {
    const avatarEntity: Avatar = {
      id: event.params.group,
      avatarType: "RegisterGroup",
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      invitedBy: undefined,
      version: 2,
      logIndex: event.logIndex,
      tokenId: bytesToBigInt(toBytes(event.params.group)).toString(),
      cidV0: undefined,
      transactionIndex: event.transaction.transactionIndex,
      wrappedTokenId: undefined,
      balance: 0n,
      lastMint: undefined,
      mintEndPeriod: undefined,
      lastDemurrageUpdate: undefined,
      trustedByN: 0,
      isVerified: false,
      profile_id: event.params.group,
    };

    context.Avatar.set(avatarEntity);
  } else {
    context.Avatar.set({
      ...avatar,
      avatarType: "RegisterGroup",
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
    });
  }

  const profile = (await context.Profile.get(event.params.group)) || {
    id: event.params.group,
    name: undefined,
    description: undefined,
    previewImageUrl: undefined,
    imageUrl: undefined,
  };

  context.Profile.set({
    ...profile,
    name: event.params.name,
    symbol: event.params.symbol,
  });

  await incrementStats(context, "signups");
});

HubV2.PersonalMint.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.human);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      lastMint: event.block.timestamp,
      mintEndPeriod: parseInt(event.params.endPeriod.toString()),
    });
  }
});

NameRegistry.UpdateMetadataDigest.handler(async ({ event, context }) => {
  let profileMetadata: { cidV0: string; data: Profile | null } | null = null;
  try {
    profileMetadata = await getProfileMetadataFromIpfs(
      event.params.metadataDigest
    );
  } catch (_) {}

  const avatar = await context.Avatar.get(event.params.avatar);

  if (!avatar) {
    // register group emits metadata event update before the register group event
    context.Avatar.set({
      id: event.params.avatar,
      avatarType: "Unknown",
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      invitedBy: undefined,
      version: 2,
      logIndex: event.logIndex,
      tokenId: bytesToBigInt(toBytes(event.params.avatar)).toString(),
      cidV0: profileMetadata?.cidV0,
      transactionIndex: event.transaction.transactionIndex,
      wrappedTokenId: undefined,
      balance: 0n,
      lastMint: undefined,
      mintEndPeriod: undefined,
      lastDemurrageUpdate: undefined,
      trustedByN: 0,
      isVerified: false,
      profile_id: event.params.avatar,
    });
  } else {
    context.Avatar.set({
      ...avatar,
      cidV0: profileMetadata?.cidV0,
    });
  }

  const currentProfile = (await context.Profile.get(event.params.avatar)) || {
    id: event.params.avatar,
    name: undefined,
    symbol: undefined,
    description: undefined,
    previewImageUrl: undefined,
    imageUrl: undefined,
  };
  context.Profile.set({
    ...currentProfile,
    ...profileMetadata?.data,
  });
});

// ###############
// ## TRANSFERS ##
// ###############

HubV2.StreamCompleted.handlerWithLoader({
  loader: async ({ event, context }) => {
    let transfers = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return { transfers };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transfers } = loaderReturn;

    for (let i = 0; i < transfers.length; i++) {
      context.Transfer.set({
        ...transfers[i],
        isPartOfStreamOrHub: true,
      });
    }

    context.Transfer.set({
      id: `${event.transaction.hash}-stream`,
      safeTxHash: undefined,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      from: event.params.from,
      to: event.params.to,
      operator: undefined,
      value: event.params.amounts.reduce((a, b) => a + b, 0n),
      // TODO: fix - this isn't always true, since it can be multiple tokens
      // eg. 0xe185f8e1f4b99383d5c801c7796b15de62e7df220087868440e6f59be5ce3909
      token: event.params.ids[0].toString(),
      transferType: "StreamCompleted",
      version: 2,
      isPartOfStreamOrHub: false,
    });
  },
});

HubV2.TransferSingle.handlerWithLoader({
  loader: async ({ event, context }) => {
    let avatar = await context.Avatar.get(event.params.to);

    return { avatar };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar } = loaderReturn;
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: [event.params.value],
      tokens: [event.params.id.toString()],
      transferType: "TransferSingle",
      avatarType: avatar?.avatarType ?? "Unknown",
      version: 2,
    });
  },
});

HubV2.TransferBatch.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: event.params.values,
      tokens: event.params.ids.map((id) => id.toString()),
      transferType: "TransferSingle",
      avatarType: "Unknown",
      version: 2,
    })
);

HubV2.DiscountCost.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.account);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      lastDemurrageUpdate: event.block.timestamp,
    });
  }
});

// ###############
// #### TRUST ####
// ###############

HubV2.Trust.handler(async ({ event, context }) => {
  if (event.params.trustee === event.params.truster) {
    return;
  }
  const trustId =
    `${event.params.truster}${event.params.trustee}2`.toLowerCase();
  const trustIdV1 =
    `${event.params.truster}${event.params.trustee}1`.toLowerCase();
  const oppositeTrustId =
    `${event.params.trustee}${event.params.truster}2`.toLowerCase();
  const oppositeTrustRelation = await context.TrustRelation.get(
    oppositeTrustId
  );
  const timeDifference =
    event.params.expiryTime - BigInt(event.block.timestamp);
  const isUntrust = timeDifference < 3600n;

  // invite
  const avatarTrustee = await context.Avatar.get(event.params.trustee);

  if (!avatarTrustee) {
    context.Avatar.set({
      id: event.params.trustee,
      avatarType: "Invite",
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      invitedBy: event.params.truster,
      version: 2,
      logIndex: event.logIndex,
      tokenId: undefined,
      cidV0: undefined,
      transactionIndex: event.transaction.transactionIndex,
      wrappedTokenId: undefined,
      balance: 0n,
      lastMint: undefined,
      mintEndPeriod: undefined,
      lastDemurrageUpdate: undefined,
      trustedByN: 1,
      isVerified: false,
      profile_id: event.params.trustee,
    });
  } else {
    const newTurdtedByN = isUntrust
      ? avatarTrustee.trustedByN - 1
      : avatarTrustee.trustedByN + 1;
    context.Avatar.set({
      ...avatarTrustee,
      invitedBy: event.params.truster,
      trustedByN: newTurdtedByN,
      isVerified: newTurdtedByN >= 3,
    });
  }

  if (isUntrust) {
    // this is untrust
    const trustRelation = await context.TrustRelation.get(trustId);
    if (trustRelation) {
      context.TrustRelation.set({
        ...trustRelation,
        expiryTime: 0n,
        limit: 0n,
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        logIndex: event.logIndex,
        isMutual: false,
      });
    }
    if (oppositeTrustRelation) {
      context.TrustRelation.set({
        ...oppositeTrustRelation,
        isMutual: false,
      });
    }
    return;
  }
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  const entity: TrustRelation = {
    id: trustId,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    version: 2,
    trustee_id: event.params.trustee,
    truster_id: event.params.truster,
    expiryTime: event.params.expiryTime,
    limit: parseEther("100"),
    isMutual,
    isMigrated: false,
  };

  context.TrustRelation.set(entity);

  const trustRelationV1 = await context.TrustRelation.get(trustIdV1);
  if (trustRelationV1) {
    context.TrustRelation.set({
      ...trustRelationV1,
      isMigrated: true,
    });
  }
  await incrementStats(context, "trusts");
});
