import { BigNumber } from 'ethers';
import { ethers } from 'ethers';

export async function getBlockNumberFromTimestamp(provider: ethers.providers.Provider, timestamp: number): Promise<number> {
    let latestBlock = await provider.getBlock('latest');
    let latestBlockNumber = latestBlock.number;
    let earliestBlockNumber = 0;

    while (earliestBlockNumber <= latestBlockNumber) {
      const middleBlockNumber = Math.floor((earliestBlockNumber + latestBlockNumber) / 2);
      const middleBlock = await provider.getBlock(middleBlockNumber);

      if (middleBlock.timestamp === timestamp) {
        return middleBlockNumber;
      } else if (middleBlock.timestamp < timestamp) {
        earliestBlockNumber = middleBlockNumber + 1;
      } else {
        latestBlockNumber = middleBlockNumber - 1;
      }
    }

    return latestBlockNumber;
}

export function BNtoStringWithoutDecimals(
    value: BigNumber,
    decimals: number
  ): string {
    if (value != null && value.gt(0)) {
      const val = value.toString();
      const digits = val.length;
      let tempVal = '';
      if (digits <= decimals) {
        tempVal = '0.';
        for (let i = 0; i < decimals - digits; i++) {
          tempVal = `${tempVal}0`;
        }
        tempVal = `${tempVal}${val}`;
      } else {
        for (let i = 0; i < digits - decimals; i++) {
          tempVal = `${tempVal}${val[i]}`;
        }
        tempVal = `${tempVal}.`;
        for (let i = digits - decimals; i < digits; i++) {
          tempVal = `${tempVal}${val[i]}`;
        }
      }
      tempVal = tempVal.replace(/0+$/, '');
      tempVal = tempVal.replace(/\.$/, '');
      if (tempVal === '') {
        tempVal = '0';
      }
      return tempVal;
    }
    return '0';
  }
