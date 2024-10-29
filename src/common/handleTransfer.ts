import {
  eventLog,
  handlerContext,
  Hub_HubTransfer_eventArgs,
  PersonalCRC_Transfer_eventArgs,
  Transfer,
  HubV2_TransferSingle_eventArgs,
  HubV2_TransferBatch_eventArgs,
  WrapperERC20Personal_Transfer_eventArgs,
} from "generated";
import { incrementStats } from "../incrementStats";
import { TransferType_t } from "generated/src/db/Enums.gen";
import { updateAvatarBalance } from "./updateAvatarBalance";

export const handleTransfer = async ({
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
