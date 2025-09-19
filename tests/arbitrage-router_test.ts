import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

Clarinet.test({
  name: "Arbitrage Router: Register Liquidity Pool",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const poolId = "test-pool-1";
    const dex = "stackswap";
    const tokenA = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-a";
    const tokenB = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-b";

    const block = chain.mineBlock([
      Tx.contractCall('arbitrage-router', 'register-pool', [
        types.ascii(poolId),
        types.ascii(dex),
        types.principal(tokenA),
        types.principal(tokenB),
        types.uint(10000),
        types.uint(5000),
        types.uint(30)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(true);

    const poolDetails = chain.callReadOnlyFn('arbitrage-router', 'get-liquidity-pool', 
      [types.ascii(poolId), types.ascii(dex)], 
      deployer.address
    );
    
    poolDetails.result.expectSome();
  },
});

Clarinet.test({
  name: "Arbitrage Router: Simulate Arbitrage Trade",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const sourcePoolId = "source-pool";
    const destPoolId = "dest-pool";
    const tokenIn = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-x";

    // Prerequisite: Register pools
    chain.mineBlock([
      Tx.contractCall('arbitrage-router', 'register-pool', [
        types.ascii(sourcePoolId),
        types.ascii("dex1"),
        types.principal(tokenIn),
        types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-y"),
        types.uint(10000),
        types.uint(5000),
        types.uint(30)
      ], deployer.address),
      Tx.contractCall('arbitrage-router', 'register-pool', [
        types.ascii(destPoolId),
        types.ascii("dex2"),
        types.principal(tokenIn),
        types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.token-y"),
        types.uint(8000),
        types.uint(6000),
        types.uint(25)
      ], deployer.address)
    ]);

    const block = chain.mineBlock([
      Tx.contractCall('arbitrage-router', 'simulate-arbitrage', [
        types.ascii(sourcePoolId),
        types.ascii(destPoolId),
        types.principal(tokenIn),
        types.uint(1000)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: "Arbitrage Router: Permission Management",
  fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('arbitrage-router', 'grant-contract-permission', [
        types.principal(wallet1.address),
        types.uint(2)  // EXECUTE permission
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});