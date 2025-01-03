import {
  eventLog,
  handlerContext,
  Hub_HubTransfer_eventArgs,
  PersonalCRC_Transfer_eventArgs,
  Transfer,
  HubV2_TransferSingle_eventArgs,
  HubV2_TransferBatch_eventArgs,
  WrappedERC20_Transfer_eventArgs,
} from "generated";
import { incrementStats } from "../incrementStats";
import {
  AvatarType_t,
  TokenType_t,
  TransferType_t,
} from "generated/src/db/Enums.gen";
import { updateAvatarBalance } from "./updateAvatarBalance";
import { getAddress, toHex, zeroAddress } from "viem";
import { makeAvatarBalanceEntityId } from "../utils";
import { id, Token_t } from "generated/src/db/Entities.gen";

const mapAvatarTypeToTokenType = (avatarType: AvatarType_t): TokenType_t => {
  switch (avatarType) {
    case "Signup":
    case "OrganizationSignup":
      return "Signup";
    case "RegisterGroup":
      return "RegisterGroup";
    default:
      return "RegisterHuman";
  }
};

export const handleTransfer = async ({
  event,
  context,
  tokens,
  values,
  transferType,
  avatarType,
  version,
  demurrageTransferId,
}: {
  event: eventLog<
    | Hub_HubTransfer_eventArgs
    | PersonalCRC_Transfer_eventArgs
    | HubV2_TransferSingle_eventArgs
    | HubV2_TransferBatch_eventArgs
    | WrappedERC20_Transfer_eventArgs
  >;
  context: handlerContext;
  tokens: (Token_t | { id: id })[];
  values: bigint[];
  transferType: TransferType_t;
  avatarType: AvatarType_t;
  version: number;
  demurrageTransferId?: string | undefined;
}) => {
  for (let i = 0; i < tokens.length; i++) {
    // const token = await context.Token.get(tokens[i]);
    const token = tokens[i];
    if (!('totalSupply' in token)) {
      let tokenOwner_id: string;
      try {
        tokenOwner_id = token.id.startsWith("0x")
          ? event.params.to
          : getAddress(`0x${BigInt(token.id).toString(16).padStart(40, "0")}`);
      } catch (_) {
        try {
          tokenOwner_id = getAddress(toHex(BigInt(token.id)));
        } catch (_) {
          tokenOwner_id = event.params.to;
        }
      }
      let totalSupply = 0n;
      if (
        (transferType === "Transfer" || transferType === "TransferSingle") &&
        event.params.from === zeroAddress
      ) {
        totalSupply = values[i];
      }

      context.Token.set({
        id: token.id,
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        transactionIndex: event.transaction.transactionIndex,
        logIndex: event.logIndex,
        transactionHash: event.transaction.hash,
        version,
        tokenType: mapAvatarTypeToTokenType(avatarType),
        tokenOwner_id,
        totalSupply,
      });
    } else {
      let totalSupply = token.totalSupply;
      if (transferType === "Transfer" || transferType === "TransferSingle") {
        if (event.params.from === zeroAddress) {
          totalSupply += values[i];
        } else if (event.params.to === zeroAddress) {
          totalSupply -= values[i];
        }
      }

      if (totalSupply !== 0n) {
        context.Token.set({
          ...token,
          totalSupply,
        });
      }
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
      operator: 'operator' in event.params ? event.params.operator : undefined,
      value: values[i],
      token: token.id,
      transferType,
      version,
      isPartOfStreamOrHub: false,
      demurrageFrom_id: demurrageTransferId,
      demurrageTo_id: undefined,
      metriFee_id: undefined,
    };
    context.Transfer.set(transferEntity);

    const avatarBalanceIdTo = makeAvatarBalanceEntityId(
      event.params.to,
      token.id
    );
    const avatarBalanceTo = (await context.AvatarBalance.get(
      avatarBalanceIdTo
    )) ?? {
      avatar_id: event.params.to,
      token_id: token.id,
    };

    updateAvatarBalance(
      avatarBalanceTo,
      context,
      values[i],
      event.block.timestamp
    );

    const avatarBalanceIdFrom = makeAvatarBalanceEntityId(
      event.params.from,
      token.id
    );
    const avatarBalanceFrom = (await context.AvatarBalance.get(
      avatarBalanceIdFrom
    )) ?? {
      avatar_id: event.params.from,
      token_id: token.id,
    };
    updateAvatarBalance(
      avatarBalanceFrom,
      context,
      -values[i],
      event.block.timestamp
    );

    await incrementStats(context, "transfers");
  }
};
