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
import { getAddress, toHex } from "viem";

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
  operator,
  values,
  tokens,
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
  operator: string | undefined;
  values: bigint[];
  tokens: string[];
  transferType: TransferType_t;
  avatarType: AvatarType_t;
  version: number;
  demurrageTransferId?: string | undefined;
}) => {
  for (let i = 0; i < tokens.length; i++) {
    const token = await context.Token.get(tokens[i]);
    if (!token) {
      let tokenOwner_id: string;
      try {
        tokenOwner_id = tokens[i].startsWith("0x")
          ? event.params.to
          : getAddress(`0x${BigInt(tokens[i]).toString(16).padStart(40, "0")}`);
      } catch (_) {
        try {
          tokenOwner_id = getAddress(toHex(BigInt(tokens[i])));
        } catch (_) {
          tokenOwner_id = event.params.to;
        }
      }
      context.Token.set({
        id: tokens[i],
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        transactionIndex: event.transaction.transactionIndex,
        logIndex: event.logIndex,
        transactionHash: event.transaction.hash,
        version,
        tokenType: mapAvatarTypeToTokenType(avatarType),
        tokenOwner_id,
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
      from_id: event.params.from,
      to_id: event.params.to,
      operator,
      value: values[i],
      token: tokens[i],
      transferType,
      version,
      isPartOfStreamOrHub: false,
      demurrageFrom_id: demurrageTransferId,
      demurrageTo_id: undefined,
    };
    context.Transfer.set(transferEntity);

    await updateAvatarBalance(context, values[i], event.block.timestamp, {
      id: event.params.to,
      token_id: tokens[i],
    });
    await updateAvatarBalance(context, -values[i], event.block.timestamp, {
      id: event.params.from,
      token_id: tokens[i],
    });
    await incrementStats(context, "transfers");
  }
};
