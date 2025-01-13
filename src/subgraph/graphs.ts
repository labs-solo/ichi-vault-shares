import { ChainId } from "@ichidao/ichi-sdk";
import { SupportedDex } from "@ichidao/ichi-vaults-sdk";
import dotenv from 'dotenv';

dotenv.config();

const graphApiKey = process.env.GRAPH_API_KEY;
if (!graphApiKey) {
  console.error('Please export GRAPH_API_KEY=***');
  process.exit();
}

export const graphUrls: any = {
    [ChainId.Sonic]: {
      [SupportedDex.SwapX]: {
        url: `https://gateway-arbitrum.network.thegraph.com/api/${graphApiKey}/subgraphs/id/Gw1DrPbd1pBNorCWEfyb9i8txJ962qYqqPtuyX6iEH8u`,
      },
    },
};