import { CirclesBacking } from "generated";

CirclesBacking.CirclesBackingInitiated.handler(async ({ event, context }) => {
  context.CirclesBacking.set({
    id: event.transaction.hash,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    circlesBackingInstance: event.params.circlesBackingInstance,
    personalCirclesAddress: event.params.personalCirclesAddress,
    backer_id: event.params.backer,
    backingAsset: event.params.backingAsset,
    lbpAddress: "",
  });
});

CirclesBacking.CirclesBackingCompleted.handler(async ({ event, context }) => {
  const circlesBacking = await context.CirclesBacking.get(
    event.transaction.hash
  );

  // If the circles backing is not found, return
  if (!circlesBacking) {
    return;
  }

  context.CirclesBacking.set({
    id: event.transaction.hash,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    backer_id: event.params.backer,
    circlesBackingInstance: event.params.circlesBackingInstance,
    lbpAddress: event.params.lbp,
    personalCirclesAddress: circlesBacking.personalCirclesAddress,
    backingAsset: circlesBacking.backingAsset,
  });
});
