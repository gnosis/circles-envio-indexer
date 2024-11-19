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

v1 trusts and v2 trusts are different entities, even between the same users. And there's a truster and trustee, which would make, filtering by two addresses, the possibility of duplicated results. Here's how it can be done

```graphql
query getTrustBetweenAddresses($address: String, $userAddress: String) {
  TrustRelation(
    where: {
      _or: [
        {
          truster_id: {_eq: $address},
          trustee_id: {_eq: $userAddress, _neq: $address}
        },
        {
          truster_id: {_eq: $userAddress},
          trustee_id: {_eq: $address, _neq: $userAddress}
        }
      ],
      version: { _in: [1, 2] }
    }
  ) {
    version
    isMutual
    truster_id
    trustee_id
  }
}
```

In case you want only v1 trust that were not migrated, you can query `isMigrated: { _eq: false }`.


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
  - `Invite`: v2 user that is not yet on circles and has at least one invite.
  - `RegisterGroup`: v2 group.
  - `RegisterOrganization`: v2 organization.
  - `Unknown`: Placeholder during processing; unlikely to occur in steady state.

Suppose you want to get the list of invited users by a given user.

```graphql
query getInvited($address: String, $limit: Int, $offset: Int) {
  TrustRelation(
    where: {version: {_eq: 2}, truster_id: {_eq: $address}, trustee: {avatarType: {_eq: "Invite"}}}
    order_by: {timestamp: desc}
    offset: $offset
    limit: $limit
  ) {
    version
    trustee {
      id
      version
      profile {
        name
      }
      avatarType
    }
  }
}
```

### TokenType
Describes token types within the system.

- **Values:**
  - `RegisterGroup`: v2 group tokens.
  - `RegisterHuman`: v2 human tokens.
  - `Signup`: v1 human tokens.
  - `WrappedDemurrageToken`: v2 demurraged tokens (applicable to humans, groups, or organizations).
  - `WrappedStaticToken`: v2 inflationary tokens (applicable to humans, groups, or organizations).
