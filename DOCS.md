## Entities

### Transfer
A unified view of all transfer transactions within the system, consolidating both v1 and v2 transfers. This entity covers all major transfer events (e.g., `Erc20WrapperTransfer`, `TransferSingle`, `HubTransfer`).

- **Key Fields:**
  - `blockNumber`
  - `timestamp`
  - `transactionIndex`
  - `logIndex`
  - `batchIndex`
  - `transactionHash`
  - `version`
  - `operator` (v2 only)
  - `from`, `to`
  - `id`
  - `value`
  - `type` (transaction type; e.g., `Erc20WrapperTransfer`, `TransferSingle`, etc.)
  - `tokenType` (e.g., `RegisterGroup`, `RegisterHuman`, etc.)


### TrustRelation
Provides a unified view of active trust relationships, consolidating data from both v1 and v2. A v2 trust won't replace a v1 trust.

- **Key Fields:**
  - `blockNumber`
  - `timestamp`
  - `transactionIndex`
  - `logIndex`
  - `transactionHash`
  - `version`
  - `trustee`
  - `truster`
  - `expiryTime` (v2 only or set to UInt256.MAX in v1)
  - `limit` (v1 only or set to `100` in v2)


Trust relations from a group to an avatar represent membership of a group (following the rules on the smart contracts).

Example:
```graphql
query getGroupMembership($groupAddress: String) {
  TrustRelation(where: {truster_id: {_eq: $groupAddress}, limit: {_gt: 0}}) {
    expiryTime
    trustee {
      profile {
        name
      }
    }
  }
}
```


### Avatar
A unified view of all humans, groups, and organizations within the system, supporting both v1 and v2 avatars.

- **Key Fields:**
  - `blockNumber`
  - `timestamp`
  - `transactionIndex`
  - `logIndex`
  - `transactionHash`
  - `version`
  - `type` (e.g., `RegisterGroup`, `RegisterOrganization`, etc.)
  - `invitedBy`
  - `avatar`
  - `tokenId`
  - `name` (for groups only)
  - `cidV0Digest` (profile IPFS CID)


### AvatarBalance
This entity tracks token balances for each avatar.


### Profile
The Profile entity contains descriptive metadata (from IPFS) for avatars, including names, images, and symbols for groups.


### Token
A unified view of tokens in the system, capturing both v1 and v2 token data.

- **Key Fields:**
  - `blockNumber`
  - `timestamp`
  - `transactionIndex`
  - `logIndex`
  - `transactionHash`
  - `version`
  - `type` (e.g., `RegisterGroup`, `RegisterHuman`, etc.)
  - `token` (token address)
  - `tokenOwner`

## Enums

### TransferType
Defines the various types of transfer actions.

- **Values:**
  - `Erc20WrapperTransfer`: v2 wrapped transfers.
  - `TransferSingle`: v2 single transfers.
  - `TransferBatch`: v2 batch transfers.
  - `StreamCompleted`: v2 completed streams.
  - `HubTransfer`: v1 transfers with pathfinder.
  - `Transfer`: v1 transfers.
  - `GroupMintSingle`: v2 group mint token single.
  - `GroupMintBatch`: v2 group mint token batch.
  - `GroupRedeem`: Reserved for future use.
  - `GroupRedeemCollateralReturn`: Reserved for future use.
  - `GroupRedeemCollateralBurn`: Reserved for future use.

### AvatarType
Defines the type of avatars.

- **Values:**
  - `Signup`: v1 user sign-up.
  - `OrganizationSignup`: v1 organization sign-up.
  - `RegisterHuman`: v2 registered or migrated user (with `invitedBy` if migrated).
  - `Invite`: v2 user awaiting or pending invites.
  - `RegisterGroup`: v2 group.
  - `RegisterOrganization`: v2 organization.
  - `Unknown`: Placeholder during processing; unlikely to occur in steady state.

### TokenType
Describes token types within the system.

- **Values:**
  - `RegisterGroup`: v2 group tokens.
  - `RegisterHuman`: v2 human tokens.
  - `Signup`: v1 human tokens.
  - `WrappedDemurrageToken`: v2 demurraged tokens (applicable to humans, groups, or organizations).
  - `WrappedStaticToken`: v2 inflationary tokens (applicable to humans, groups, or organizations).
