/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as pkg from '@apollo/client';
import 'cross-fetch/dist/node-polyfill.js';
import {
  ChainId
} from '@ichidao/ichi-sdk';

const { ApolloClient, InMemoryCache, gql } = pkg;

const vaultQuery = `
query($vault: String){
  ichiVaults(where:{id: $vault}){
    id
    tokenA
    tokenB
    allowTokenA
    allowTokenB
  }
}`;

const transferQuery = (page: number, timestamp: number) => gql`
query($vault: String){
  vaultTransfers(first: 100, skip: ${
      page * 100
    },
    where: {vault: $vault, createdAtTimestamp_lte: ${timestamp}},
    orderBy: createdAtTimestamp
  ) {
    totalSupply
    to
    from
    id
    createdAtTimestamp
    value
  }
}`;

export type GraphVault = {
  id: string;
  tokenA: string;
  tokenB: string;
  allowTokenA: boolean;
  allowTokenB: boolean;
};

export type Holder = {
  address: string;
  value: string;
  share: string;
};

export type GraphTransfer = {
  id: string;
  from: string;
  to: string;
  createdAtTimestamp: string;
  totalSupply: string;
  value: string;
  holders?: Holder[];
};

export async function vault_graph_query(
  vaultAddress: string,
  endpoint: string,
  chainId: ChainId
) {
  const client = new ApolloClient({
    uri: endpoint,
    cache: new InMemoryCache()
  });
  try {
    return await client.query({
      query: gql(vaultQuery),
      variables: {
        vault: vaultAddress.toLowerCase()
      }
    });
  } catch (error) {
    console.error(`error: vault subgraph is not available ${endpoint}: ${error}`);
    return false;
  }
}

export async function transfer_graph_query(
  vaultAddress: string,
  endpoint: string,
  chainId: ChainId,
  timestamp: number
) {
  const client = new ApolloClient({
    uri: endpoint,
    cache: new InMemoryCache()
  });

  let allTransfers = [];
  let page = 0;
  let hasMoreResults = true;

  // in case timestamp is not provided, use the current timestamp
  if (timestamp === 0) {
    timestamp = Math.ceil(Date.now() / 1000);
  }

  try {
    while (hasMoreResults) {
      const { data } = await client.query({
        query: transferQuery(page, timestamp),
        variables: {
          vault: vaultAddress.toLowerCase()
        }
      });

      const transfers = data?.vaultTransfers || [];
      allTransfers = allTransfers.concat(transfers);

      // Check if we got less than 100 records, if so, we've retrieved all available records
      if (transfers.length < 100) {
        hasMoreResults = false;
      } else {
        page += 1;
      }
    }

    return allTransfers;
  } catch (error) {
    console.error(`Error: vault subgraph is not available at ${endpoint}: ${error}`);
    return false;
  }
}

export async function getVaultRecord(address: string, endpoint: string, chainId: ChainId): Promise<false | GraphVault> {
  const data = await vault_graph_query(
    address,
    endpoint,
    chainId
  );
  //console.log(data['data']['ichiVaults']);
  if (data && data.data && data.data.ichiVaults && data.data.ichiVaults.length > 0) {
    const temp: GraphVault = {
          id: data.data.ichiVaults[0].id,
          tokenA: data.data.ichiVaults[0].tokenA,
          tokenB: data.data.ichiVaults[0].tokenB,
          allowTokenA: data.data.ichiVaults[0].allowTokenA,
          allowTokenB: data.data.ichiVaults[0].allowTokenB
    };
    //console.log(temp);
    return temp;
  } else {
    return false;
  }
}

export async function getTransferRecords(address: string, endpoint: string, chainId: ChainId, timestamp: number): Promise<GraphTransfer[]> {
  const data = await transfer_graph_query(
    address,
    endpoint,
    chainId,
    timestamp
  );
  // console.log(data);
  if (data && data.length > 0) {
    let results = [];
    for (let i = 0; i < data.length; i++) {
      const temp: GraphTransfer = {
        id: data[i].id,
        value: data[i].value,
        from: data[i].from,
        to: data[i].to,
        createdAtTimestamp: data[i].createdAtTimestamp,
        totalSupply: data[i].totalSupply,
    };
    //console.log(temp);
    results.push(temp);
  }
    return results;
  } else {
    return [];
  }
}

