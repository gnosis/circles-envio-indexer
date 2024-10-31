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
  
  function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
    return `${avatarId}-${tokenId}`;
  }

WrappedERC20.Transfer.handler(
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
      const balanceChange =
        operation === "deposit"
          ? event.params.inflationaryAmount
          : -event.params.inflationaryAmount;
      context.AvatarBalance.set({
        ...avatarBalance,
        inflationaryValue: avatarBalance.inflationaryValue! + balanceChange,
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
      const balanceChange =
        operation === "deposit"
          ? event.params.demurragedAmount
          : -event.params.demurragedAmount;
      const inflationaryValueChange =
        operation === "deposit" ? event.params.amount : -event.params.amount;
      context.AvatarBalance.set({
        ...avatarBalance,
        balance: avatarBalance.balance! - event.params.amount + balanceChange,
        inflationaryValue:
          avatarBalance.inflationaryValue! + inflationaryValueChange,
      });
    }
  }
  
  WrappedERC20.DepositInflationary.handler(async ({ event, context }) => {
    await updateInflationaryAvatarBalance(event, context, "deposit");
  });
  
  WrappedERC20.WithdrawInflationary.handler(
    async ({ event, context }) => {
      await updateInflationaryAvatarBalance(event, context, "withdraw");
    }
  );