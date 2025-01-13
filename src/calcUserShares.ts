import { ChainId } from '@ichidao/ichi-sdk/dist/src/crypto/networks';
import { SupportedDex } from '@ichidao/ichi-vaults-sdk';
import { BigNumber } from 'ethers';
import { getTransferRecords, GraphTransfer, Holder } from './subgraph/vaults';
import dotenv from 'dotenv';
import { BNtoStringWithoutDecimals } from './utils/conversions';

dotenv.config();

// const graphEndpoint = graphUrls[chainId][dex].url;
const graphEndpoint = "https://api.studio.thegraph.com/query/88584/sonic-v1-swapx/version/latest";
const VAULT = "0xc263e421Df94bdf57B27120A9B7B8534A6901D95";
const GAUGE = "0x29d10053BE597E0eBe6BD0434c4f4b750F0f3b69";
const CHAIN_ID = ChainId.Sonic;
const DEX = SupportedDex.SwapX;
const start = 1736640000
const end = 1736661600

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const PRECISION = BigNumber.from("1000000000000000000000000000"); // e27

type RewardMap = {
  [address: string]: BigNumber;
};
type RewardMapString = {
  [address: string]: string;
};

async function getVaultData(vault, dex, chainId, timestamp = 0) {
  return await getTransferRecords(vault, graphEndpoint, chainId, timestamp) as GraphTransfer[];
}

function calculateShares(holders, totalSupply) {
  // Step 1: Calculate the total value
  const totalValue = holders.reduce((accumulator, holder) => {
      return accumulator.add(BigNumber.from(holder.value));
  }, BigNumber.from(0));

  // sanity check. Total Supply should be equal to the sum of all holders' values
  // if (!totalValue.eq(BigNumber.from(totalSupply))) {
  //   throw new Error(`Total value of holders (${totalValue.toString()}) does not match total supply (${totalSupply})`);
  // }

  // Step 2: Calculate and update each holder's share based on the total value
  // very small precision loss here: when summing up all shares, the total sum may be slightly less than 1e18: eq 999999999999999986
  // when using 1e27 as precision, the same tiny precision loss on last 2 digits only.
  holders.forEach(holder => {
      if (totalValue.eq(0)) {
          holder.share = '0';
      } else {
          // Calculate share as a percentage
          holder.share = BigNumber.from(holder.value).mul(PRECISION).div(totalValue).toString();
      }
  });

  return holders;
}

function addHolderReward(
  rewards: RewardMap,
  holderAddress: string,
  holderShare: string,
  transferDuration: number
) {
  const holderReward = BigNumber.from(holderShare).mul(BigNumber.from(transferDuration));

  rewards[holderAddress] = rewards[holderAddress]
    ? rewards[holderAddress].add(holderReward)
    : holderReward;
}

function calculateRewards(transfers: GraphTransfer[], startTimestamp: number, endTimestamp: number): RewardMap {
  const rewards: RewardMap = {};

  for (let i = 1; i < transfers.length; i++) {
      // skip the first transfer - it can't accumulate rewards
      const transfer = transfers[i];
      const transferTimestamp = parseInt(transfer.createdAtTimestamp, 10);

      // TODO: add the case when no transfers happened between start and end dates

      const prevTransfer = transfers[i-1];
      const prevTransferTimestamp = parseInt(prevTransfer.createdAtTimestamp, 10);

      if (transferTimestamp >= startTimestamp) {
        let transferDuration = 0;
        if (transferTimestamp <= endTimestamp) {
          if (prevTransferTimestamp >= startTimestamp) {
            // normal calculation of rewards for the duration between two transfers
            transferDuration = transferTimestamp - prevTransferTimestamp;
          } else {
            // the first transfer in the sequence of transfers after the start date
            transferDuration = transferTimestamp - startTimestamp;
          }
          for (const holder of prevTransfer.holders) {
            addHolderReward(rewards, holder.address, holder.share, transferDuration);
          }

          if (i == transfers.length - 1) {
            // it was the last transfer, but need to count rewards up to the end date
            transferDuration = endTimestamp - transferTimestamp;

            for (const holder of transfer.holders) {
              addHolderReward(rewards, holder.address, holder.share, transferDuration);
            }
          }

        } else if (prevTransferTimestamp <= endTimestamp) {
          // the first transfer after the end date, need to count rewards for partial duration
          transferDuration = endTimestamp - prevTransferTimestamp;

          for (const holder of prevTransfer.holders) {
            addHolderReward(rewards, holder.address, holder.share, transferDuration);
          }
        }
      }
  }

  return rewards;
}

function convertRewardsToPercentages(rewards: RewardMap): RewardMapString {
  const total = end - start; // exact number of seconds between start and end timestamps = total rewards

  const percentages: RewardMapString = {};

  for (const address in rewards) {
      if (rewards.hasOwnProperty(address)) {
        percentages[address] = BNtoStringWithoutDecimals(rewards[address].div(total), 25);
        // console.log(percentages[address]);
        // console.log(rewards[address].div(BigNumber.from(total)).toString());
      }
  }

  return percentages;
}

function filterOutDepositGuard(data: GraphTransfer[]): GraphTransfer[] {
  const filteredData: GraphTransfer[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < data.length - 1 &&
        data[i].createdAtTimestamp === data[i+1].createdAtTimestamp &&
        data[i].value === data[i+1].value) {
          if (data[i].to === data[i+1].from) {
            filteredData.push({
              id: data[i].id,
              value: data[i].value,
              createdAtTimestamp: data[i].createdAtTimestamp,
              to: data[i+1].to,
              from: data[i].from,
              totalSupply: data[i].totalSupply
            });
            i++;
          } else if (data[i].from === data[i+1].to) {
            filteredData.push({
              id: data[i].id,
              value: data[i].value,
              createdAtTimestamp: data[i].createdAtTimestamp,
              to: data[i].to,
              from: data[i+1].from,
              totalSupply: data[i].totalSupply
            });
            i++;
          } else {
            filteredData.push(data[i]);
          }
        } else {
          filteredData.push(data[i]);
        }
  }
  return filteredData;
}

function filterOutGauge(data: GraphTransfer[]): GraphTransfer[] {
  const filteredData: GraphTransfer[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].to.toLowerCase() !== GAUGE.toLowerCase() &&
        data[i].from.toLowerCase() !== GAUGE.toLowerCase()) {
            filteredData.push(data[i]);
    }
  }
  return filteredData;
}

// ========================================
// Main function

(async () => {

  let vaultData = await getVaultData(VAULT, DEX, CHAIN_ID, end);
  vaultData = filterOutDepositGuard(vaultData);
  vaultData = filterOutGauge(vaultData);
  //console.log(JSON.stringify(vaultData));

  if (vaultData.length > 0) {
    let holder: Holder = {
      address: vaultData[0].to,
      value: vaultData[0].value,
      share: '0'
    };
    vaultData[0].holders = [holder];
  }

  // set shares for the first transfer
  let updatedHolders = calculateShares(vaultData[0].holders, vaultData[0].totalSupply);
  vaultData[0].holders = [ ...updatedHolders ];

  for (let index = 1; index < vaultData.length; index++) {
    vaultData[index].holders = [];
    let found = false;
    for (let k = 0; k < vaultData[index-1].holders.length; k++) {
      let holder = { ...vaultData[index-1].holders[k] };

      if (vaultData[index].from === holder.address) {
        holder.value = BigNumber.from(holder.value).sub(BigNumber.from(vaultData[index].value)).toString();
        if (holder.value !== '0') {
          vaultData[index].holders.push(holder);
        }
      } else if (vaultData[index].to === holder.address) {
        holder.value = BigNumber.from(holder.value).add(BigNumber.from(vaultData[index].value)).toString();
        vaultData[index].holders.push(holder);
        found = true;
      } else {
        vaultData[index].holders.push(holder);
      }
    }
    if (!found && vaultData[index].to !== NULL_ADDRESS) {
      vaultData[index].holders.push({
        address: vaultData[index].to,
        value: vaultData[index].value,
        share: '0'
      });
    }
    updatedHolders = calculateShares(vaultData[index].holders, vaultData[index].totalSupply);
    vaultData[index].holders = [ ...updatedHolders ];
  }
  const rewards = calculateRewards(vaultData, start, end);
  // console.log(rewards);
  const rewardPercentages = convertRewardsToPercentages(rewards);
  console.log(rewardPercentages);
  for (let rp in rewardPercentages) {
    console.log(rp);
  }
  for (let rp in rewardPercentages) {
    console.log(rewardPercentages[rp]);
  }

})();
