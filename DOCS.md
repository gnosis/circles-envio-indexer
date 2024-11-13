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
