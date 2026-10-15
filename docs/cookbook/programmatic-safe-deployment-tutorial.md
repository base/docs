# Programmatic Safe Deployment: Build a 2-of-3 Multisig

**Author:** jadonamite
**Topic:** Account Abstraction & Security
**Level:** Intermediate
**Prerequisites:** Node.js v18+, Base Sepolia ETH, 3 Wallet Addresses

The **Safe** (formerly Gnosis Safe) is the industry standard for multisig wallets. While most users interact with it via the UI, developers often need to deploy Safes programmatically—for example, to spin up a new treasury for every DAO created on their platform.

In this tutorial, we will use the **Safe Protocol Kit (v5)** and **Viem** to deploy a **2-of-3 Multisig** on Base Sepolia. This means the wallet requires 2 signatures out of 3 owners to execute any transaction.

---

## 1. Architecture

* **SDK:** `@safe-global/protocol-kit` (v5).
* **Signer:** A standard EOA (Externally Owned Account) that pays the gas for deployment.
* **Safe Config:** 3 Owners, Threshold of 2.
* **Network:** Base Sepolia (Chain ID: 84532).

---

## 2. Prerequisites

Initialize your project and install the specific Safe dependencies.

```bash
mkdir safe-deployer
cd safe-deployer
npm init -y
npm install typescript tsx dotenv @types/node --save-dev
npm install viem @safe-global/protocol-kit @safe-global/types-kit

```

Create a `.env` file:

```env
# The private key of the account paying for the deployment gas
DEPLOYER_PRIVATE_KEY=0x...

```

---

## 3. Implementation

We will write a script that defines the Safe configuration, predicts the address (deterministic deployment), and executes the deployment transaction.

### The Deployment Script (`src/deploy_safe.ts`)

Create `src/deploy_safe.ts`:

```typescript
import { SafeAccountConfig, PredictedSafeProps } from '@safe-global/protocol-kit';
import Safe from '@safe-global/protocol-kit';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// 1. Configuration
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

// The 3 owners of the multisig (Replace these with real addresses you control for testing)
const OWNERS = [
  '0x0000000000000000000000000000000000000001', // Owner 1
  '0x0000000000000000000000000000000000000002', // Owner 2
  '0x0000000000000000000000000000000000000003', // Owner 3
];
const THRESHOLD = 2; // 2-of-3

async function main() {
  // Setup Viem Client
  const account = privateKeyToAccount(DEPLOYER_KEY);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  console.log(`🚀 Preparing deployment with deployer: ${account.address}`);

  // 2. Configure the Safe
  const safeAccountConfig: SafeAccountConfig = {
    owners: OWNERS,
    threshold: THRESHOLD,
    // Optional: Payment settings, fallback handler, etc.
  };

  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig,
    safeDeploymentConfig: {
      saltNonce: Date.now().toString(), // Unique salt to ensure new address every time
    },
  };

  // 3. Initialize Protocol Kit
  // Note: We use the Safe class directly (v5 standard)
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: DEPLOYER_KEY,
    predictedSafe,
  });

  // 4. Predict Address
  const safeAddress = await protocolKit.getAddress();
  console.log(`🔮 Predicted Safe Address: ${safeAddress}`);

  // 5. Create Deployment Transaction
  // The SDK generates the transaction data needed to call the Safe Proxy Factory
  const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

  console.log('📝 Deployment transaction created. Broadcasting...');

  // 6. Execute via Viem
  const txHash = await client.sendTransaction({
    to: deploymentTransaction.to as `0x${string}`,
    value: BigInt(deploymentTransaction.value),
    data: deploymentTransaction.data as `0x${string}`,
    chain: baseSepolia,
  });

  console.log(`✅ Transaction sent! Hash: ${txHash}`);
  console.log(`🔗 View on Basescan: https://sepolia.basescan.org/tx/${txHash}`);
  console.log(`🔗 View Safe: https://app.safe.global/sep:${safeAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

```

### Step 4: Deploy

Run the script:

```bash
npx tsx src/deploy_safe.ts

```

**Expected Output:**

```text
🚀 Preparing deployment with deployer: 0x...
🔮 Predicted Safe Address: 0x...
📝 Deployment transaction created. Broadcasting...
✅ Transaction sent! Hash: 0x...
🔗 View on Basescan: ...

```

---

## 4. Common Pitfalls

1. **"Execution Reverted" / Deployment Failed:**
* **Context:** The `saltNonce` matches a Safe that has *already* been deployed with this specific configuration.
* **Fix:** We used `Date.now().toString()` as the salt in the code above to ensure uniqueness. In production, you might want a deterministic salt to redeploy the *same* address on multiple chains.


2. **Wrong Chain ID:**
* **Context:** The Safe Proxy Factory addresses differ slightly between chains if not using the canonical deployment.
* **Fix:** The Safe SDK automatically detects `base-sepolia` (84532) and uses the canonical factory `0xa6b71e26c5e0845f74c812102ca7114b6a896ab2`.


3. **Viem vs Ethers:**
* **Context:** The SDK returns a generic transaction object.
* **Fix:** Ensure you cast the `to` and `data` properties to ``0x${string}`` when passing them to `client.sendTransaction`, as Viem is strict about types.



---

