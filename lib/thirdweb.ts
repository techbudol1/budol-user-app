import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";

const THIRDWEB_CLIENT_ID = "462f0a29f457f270bd872b7f7cac161a";

export const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
export const web3Chain = arbitrumSepolia;
export const BUDOL_TOKEN_ADDRESS = "0x12fF5d28F93c1CABDA4Bd0ddf8906FF7E4Df1c4e";
export const BUDOL_ESCROW_ADDRESS = "0xC6488D9Fb82C1cB112482643C62478D4D28bcB0E";
export const BUDOL_TOKEN_DECIMALS = 18;
export const BUDOL_TOKEN_SYMBOL = "BUDOL";

export const createBudolSocialWallet = () =>
  inAppWallet({
    auth: {
      mode: "popup",
      options: ["google", "facebook"],
    },
    metadata: {
      name: "Budol",
      icon: "/assets/budol-politics-market.png",
    },
  });
