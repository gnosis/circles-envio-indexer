import {
  HandlerTypes_handler,
  HandlerTypes_loader,
  SafeAccount,
  SafeAccount_ExecutionSuccess_eventArgs,
  SafeAccount_UserOperationEvent_eventArgs,
} from "generated";
import { Transfer_t } from "generated/src/db/Entities.gen";

const loader: HandlerTypes_loader<
  | SafeAccount_UserOperationEvent_eventArgs
  | SafeAccount_ExecutionSuccess_eventArgs,
  {
    transfers: Transfer_t[];
  }
> = async ({ event, context }) => {
  let transfers = await context.Transfer.getWhere.transactionHash.eq(
    event.transaction.hash
  );

  return { transfers };
};

const handler: HandlerTypes_handler<
  | SafeAccount_ExecutionSuccess_eventArgs
  | SafeAccount_UserOperationEvent_eventArgs,
  {
    transfers: Transfer_t[];
  }
> = async ({ event, context, loaderReturn }) => {
  const { transfers } = loaderReturn;

  const transfer = transfers.find(
    (t) =>
      t.transferType === "StreamCompleted" || t.transferType === "PersonalMint"
  );
  if (transfer) {
    context.Transfer.set({
      ...transfer,
      safeTxHash:
        "txHash" in event.params
          ? event.params.txHash
          : event.params.userOpHash,
    });
  } else if (transfers.length > 0) {
    context.Transfer.set({
      ...transfers[0],
      safeTxHash:
        "txHash" in event.params
          ? event.params.txHash
          : event.params.userOpHash,
    });
  }
};

SafeAccount.ExecutionSuccess.handlerWithLoader({
  loader,
  handler,
});

// SafeAccount.UserOperationEvent.handlerWithLoader({
//   loader,
//   handler,
// });
