import {
  eventLog,
  handlerContext,
  WrappedERC20,
  WrappedERC20_DepositInflationary_eventArgs,
  WrappedERC20_WithdrawInflationary_eventArgs,
  WrappedERC20_DepositDemurraged_eventArgs,
  WrappedERC20_WithdrawDemurraged_eventArgs,
} from "generated";
import { handleTransfer } from "../common/handleTransfer";
import { makeAvatarBalanceEntityId } from "../utils";

WrappedERC20.Transfer.handlerWithLoader({
  loader: async ({ event, context }) => {
    const [avatar, tokenOrNull] = await Promise.all([
      context.Avatar.get(event.params.to),
      context.Token.get(event.srcAddress)
    ]);
    const token = tokenOrNull ?? { id: event.srcAddress };
    return { avatar, token };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar, token } = loaderReturn;
    await handleTransfer({
      event,
      context,
      tokens: [token],
      values: [event.params.value],
      transferType: "Erc20WrapperTransfer",
      avatarType: avatar?.avatarType ?? "Unknown",
      version: 2,
    });
  },
});

async function updateDemurragedAvatarBalance(
  event: eventLog<
    | WrappedERC20_DepositDemurraged_eventArgs
    | WrappedERC20_WithdrawDemurraged_eventArgs
  >,
  context: handlerContext,
  operation: "deposit" | "withdraw"
) {
  const avatarId = event.params.account;
  const tokenId = event.srcAddress;
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const avatarBalance = await context.AvatarBalance.get(balanceId);

  if (avatarBalance) {
    const computedValueChange =
      operation === "deposit"
        ? -event.params.amount + event.params.inflationaryAmount
        : event.params.amount - event.params.inflationaryAmount;
    context.AvatarBalance.set({
      ...avatarBalance,
      computedValue: avatarBalance.computedValue! + computedValueChange,
    });
  }
}

WrappedERC20.DepositDemurraged.handler(async ({ event, context }) => {
  await updateDemurragedAvatarBalance(event, context, "deposit");
});

WrappedERC20.WithdrawDemurraged.handler(async ({ event, context }) => {
  await updateDemurragedAvatarBalance(event, context, "withdraw");
});

/**
 * On inflationary tokens, the `amount` on transfers is the inflationary value so we adjust to
 * always keep the `balance` property as demurraged amount even if the token is inflationary.
 * Amount is added in `updateAvatarBalance` then subtracted here because it might be a simple transfer.
 */
async function updateInflationaryAvatarBalance(
  event: eventLog<
    | WrappedERC20_DepositInflationary_eventArgs
    | WrappedERC20_WithdrawInflationary_eventArgs
  >,
  context: handlerContext,
  operation: "deposit" | "withdraw"
) {
  const avatarId = event.params.account;
  const tokenId = event.srcAddress;
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const avatarBalance = await context.AvatarBalance.get(balanceId);

  if (avatarBalance) {
    const computedValueChange =
      operation === "deposit"
        ? -event.params.amount + event.params.demurragedAmount
        : event.params.amount - event.params.demurragedAmount;
    context.AvatarBalance.set({
      ...avatarBalance,
      computedValue: avatarBalance.computedValue! + computedValueChange,
    });
  }
}

WrappedERC20.DepositInflationary.handler(async ({ event, context }) => {
  await updateInflationaryAvatarBalance(event, context, "deposit");
});

WrappedERC20.WithdrawInflationary.handler(async ({ event, context }) => {
  await updateInflationaryAvatarBalance(event, context, "withdraw");
});
