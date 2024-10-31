import {
  eventLog,
  handlerContext,
  Hub_HubTransfer_eventArgs,
  PersonalCRC_Transfer_eventArgs,
  ERC20Lift,
  HubV2,
  WrapperERC20Personal,
  Avatar,
  TrustRelation,
  Transfer,
  HubV2_TransferSingle_eventArgs,
  HubV2_TransferBatch_eventArgs,
  WrapperERC20Personal_Transfer_eventArgs,
  NameRegistry,
  SafeAccount,
} from "generated";
import { toBytes, bytesToBigInt, zeroAddress, parseEther } from "viem";
import { incrementStats } from "../incrementStats";
import { TransferType_t } from "generated/src/db/Enums.gen";
import { getProfileMetadataFromIpfs } from "../utils";
import { Profile } from "../types";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

// ###############
// #### TOKEN ####
// ###############

ERC20Lift.ERC20WrapperDeployed.contractRegister(async ({ event, context }) => {
  context.addWrapperERC20Personal(event.params.erc20Wrapper);
});

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
    tokenOwner: event.params.avatar,
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
      profile_id: event.params.avatar,
    };

    context.Avatar.set(avatarEntity);
    await incrementStats(context, "signups");
  }
});

HubV2.RegisterHuman.contractRegister(async ({ event, context }) => {
  context.addSafeAccount(event.params.avatar);
});

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
    name: "name not found",
    description: "",
    previewImageUrl: "",
    imageUrl: "",
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
    name: "name not found",
    symbol: "",
    description: "",
    previewImageUrl: "",
    imageUrl: "",
  };
  context.Profile.set({
    ...currentProfile,
    ...profileMetadata?.data,
  });
});

// ###############
// ## TRANSFERS ##
// ###############

const updateAvatarBalance = async (
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

const handleTransfer = async ({
  event,
  context,
  operator,
  values,
  tokens,
  transferType,
  version,
}: {
  event: eventLog<
    | Hub_HubTransfer_eventArgs
    | PersonalCRC_Transfer_eventArgs
    | HubV2_TransferSingle_eventArgs
    | HubV2_TransferBatch_eventArgs
    | WrapperERC20Personal_Transfer_eventArgs
  >;
  context: handlerContext;
  operator: string | undefined;
  values: bigint[];
  tokens: string[];
  transferType: TransferType_t;
  version: number;
}) => {
  let isWrapped = transferType === "Erc20WrapperTransfer";

  for (let i = 0; i < tokens.length; i++) {
    const token = await context.Token.get(tokens[i]);
    if (!token) {
      context.Token.set({
        id: tokens[i],
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        transactionIndex: event.transaction.transactionIndex,
        logIndex: event.logIndex,
        transactionHash: event.transaction.hash,
        version,
        // TODO: fix
        tokenType: "RegisterHuman",
        // TODO: fix
        tokenOwner: event.params.to,
      });
    }

    const transferEntity: Transfer = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      safeTxHash: undefined,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      from: event.params.from,
      to: event.params.to,
      operator,
      value: values[i],
      token: tokens[i],
      transferType,
      version,
      isPartOfStream: false,
    };
    context.Transfer.set(transferEntity);

    await updateAvatarBalance(
      context,
      event.params.to,
      tokens[i],
      values[i],
      version,
      isWrapped,
      undefined,
      undefined
    );
    await updateAvatarBalance(
      context,
      event.params.from,
      tokens[i],
      -values[i],
      version,
      isWrapped,
      undefined,
      undefined
    );
    await incrementStats(context, "transfers");
  }
};

HubV2.StreamCompleted.handlerWithLoader({
  loader: async ({ event, context }) => {
    let transfers = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return { transfers };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transfers } = loaderReturn;

    // delete the transfers only
    // it's important to not reverse balances because of how the pathfinder works.
    for (let i = 0; i < transfers.length; i++) {
      const tx = await context.Transfer.get(transfers[i].id);
      if (tx) {
        context.Transfer.set({
          ...tx,
          isPartOfStream: true,
        });
        // decrese transfer count
      }
    }

    // register as transfer
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
      isPartOfStream: false,
    });
  },
});

HubV2.TransferSingle.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: [event.params.value],
      tokens: [event.params.id.toString()],
      transferType: "TransferSingle",
      version: 2,
    })
);

HubV2.TransferBatch.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: event.params.values,
      tokens: event.params.ids.map((id) => id.toString()),
      transferType: "TransferSingle",
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

WrapperERC20Personal.Transfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: undefined,
      values: [event.params.value],
      tokens: [event.srcAddress],
      transferType: "Erc20WrapperTransfer",
      version: 2,
    })
);

WrapperERC20Personal.DepositDemurraged.handler(async ({ event, context }) => {
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    event.params.inflationaryAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.WithdrawDemurraged.handler(async ({ event, context }) => {
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    -event.params.inflationaryAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.DepositInflationary.handler(async ({ event, context }) => {
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    event.params.demurragedAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.WithdrawInflationary.handler(
  async ({ event, context }) => {
    await updateAvatarBalance(
      context,
      event.params.account,
      event.srcAddress,
      0n,
      2,
      true,
      -event.params.demurragedAmount,
      event.block.timestamp
    );
  }
);

// ###############
// #### TRUST ####
// ###############

HubV2.Trust.handler(async ({ event, context }) => {
  if (event.params.trustee === event.params.truster) {
    return;
  }
  const trustId = `${event.params.truster}${event.params.trustee}`;
  const oppositeTrustId = `${event.params.trustee}${event.params.truster}`;
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
      profile_id: event.params.trustee,
    });
  } else {
    context.Avatar.set({
      ...avatarTrustee,
      trustedByN: isUntrust
        ? avatarTrustee.trustedByN - 1
        : avatarTrustee.trustedByN + 1,
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
  };

  context.TrustRelation.set(entity);
  await incrementStats(context, "trusts");
});
