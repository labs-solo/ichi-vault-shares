# Ichi Vaults Shares

## Description
This project calculates weighted user shares in liquidity vaults, taking into account both the duration of participation and the size of each user's position. The weighting formula considers:

1. Time-weighted participation: The length of time a user's liquidity was in the vault during the specified time window
2. Position size: The amount of LP tokens held by the user during their participation period

For example, if two users each deposit 100 LP tokens, but User A was in the vault for the entire period while User B was only in for half the period, User A's share would be twice that of User B. Similarly, if they were both in for the same duration but User A had 200 LP tokens while User B had 100, User A's share would be double.

This calculation is particularly useful for:
- Distributing rewards based on true participation
- Understanding user engagement over specific time periods
- Analyzing vault participation patterns

The script supports different chains and DEXes, allowing for flexible analysis across various vaults and time periods.

## Project Setup

### Prerequisites
- Node.js 18+ (You can install it from here)
- npm

### Install Dependencies
To install the dependencies for the project, run:
```bash
npm install
```

## Running the Calculation Script
The primary script for calculating user shares is located in `src/calcUserShares.ts`. You can run the script with the following command:
```bash
npm run userShares
```
This will execute the `calcUserShares.ts` file using ts-node.

## Configuration of calcUserShares.ts
In order to configure the script for your specific use case, you will need to modify certain values inside the `calcUserShares.ts` file. Follow the instructions below to configure the script properly:

### Select Graph Endpoint
By default, the script uses a Studio subgraph endpoint:
```typescript
// const graphEndpoint = graphUrls[chainId][dex].url;
const graphEndpoint = "https://api.studio.thegraph.com/query/88584/sonic-v1-swapx/version/latest";
```

If you'd like to use the published subgraph instead, you will need to:
1. Uncomment the following line to use the published subgraph URL:
```typescript
const graphEndpoint = graphUrls[chainId][dex].url;
```
2. Add your Graph API Key to your environment variables. To do this, create a `.env` file in the root of your project and add the following:
```
GRAPH_API_KEY=your-api-key-here
```
You can get your Graph API key by signing up on The Graph, creating a subgraph, and accessing your API key from the dashboard.

### Choose Chain, DEX, Vault Address, and Time Window
You can customize the following values based on your requirements:

- **CHAIN_ID**: Specify the chain ID of the network you're querying.
```typescript
const CHAIN_ID = ChainId.Sonic; // Change to the desired chain ID
```

- **DEX**: Choose the decentralized exchange (DEX) you want to use.
```typescript
const DEX = SupportedDex.SwapX; // Change to the desired DEX (e.g., SwapX)
```

- **VAULT**: Provide the address of the vault you want to calculate shares for.
```typescript
const VAULT = "0xc263e421Df94bdf57B27120A9B7B8534A6901D95"; // Replace with your vault address
```

- **GAUGE**: Provide the address of the gauge attached to the vault
```typescript
const GAUGE = "0x29d10053BE597E0eBe6BD0434c4f4b750F0f3b69"; // Replace with the gauge address
```

- **Start and End Time**: Set the start and end times for the period you're interested in.
```typescript
const start = 1736640000; // Unix timestamp for start time
const end = 1736661600; // Unix timestamp for end time
```

### Environment Variables
Make sure to define your environment variables in the `.env` file if you are using a Graph API key for authentication.
```
GRAPH_API_KEY=your-api-key-here
```

## Run the Script
Once you've configured the file, you can run the script using the following command:
```bash
npm run userShares
```
This will calculate the user shares based on the settings you've configured in the `calcUserShares.ts` file.

## Linting
To ensure that your code adheres to the project's coding standards, you can run ESLint with:
```bash
npm run lint
```
This will lint all TypeScript and TypeScript JSX files in the project.

## License
This project is licensed under the MIT License.
