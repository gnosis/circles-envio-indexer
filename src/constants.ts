const GNOSIS_CHIADO_CHAIN_ID = 10200;
const chainId = GNOSIS_CHIADO_CHAIN_ID;

export const MIGRATION_CONTRACT_ADDRESS = chainId == GNOSIS_CHIADO_CHAIN_ID ? '0x12e815963a0b910288c7256cad0d345c8f5db08e' : '0x8C9BeAccb6b7DBd3AeffB5D77cab36b62Fe98882';
export const HUB_V1_CONTRACT_ADDRESS = chainId == GNOSIS_CHIADO_CHAIN_ID ? '0xdbF22D4e8962Db3b2F1d9Ff55be728A887e47710' : '0x29b9a7fbb8995b2423a71cc17cf9810798f6c543';
export const HUB_V2_CONTRACT_ADDRESS = chainId == GNOSIS_CHIADO_CHAIN_ID ? '0xEddc960D3c78692BF38577054cb0a35114AE35e0' : '';