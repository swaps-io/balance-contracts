import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';

const BALANCE_BITS = 240n;
const BALANCE_MASK = (1n << BALANCE_BITS) - 1n;
const ERROR_BALANCE = BALANCE_MASK;
const MAX_BALANCE = BALANCE_MASK - 1n;

const uncompressBalances = (compressedBalances: readonly bigint[], totalBalances: number): bigint[] => {
  let balances: bigint[] = [];
  for (const compressedBalance of compressedBalances) {
    const balance = compressedBalance & BALANCE_MASK;
    balances.push(balance);

    const repeats = compressedBalance >> BALANCE_BITS;
    for (let i = 0n; i < repeats; i++) {
      balances.push(balance);
    }
  }

  const omittedZeros = totalBalances - balances.length;
  for (let i = 0; i < omittedZeros; i++) {
    balances.push(0n);
  }

  return balances;
};

describe('BalanceCollector2Test', function () {
  async function deployFixture() {
    const publicClient = await viem.getPublicClient();
    const walletClients = await viem.getWalletClients();

    const tokens = [];
    for (let i = 0; i < 16; i++) {
      const token = await viem.deployContract('TestToken');
      tokens.push(token);
    }
    const tokenAddresses = tokens.map((t) => t.address);
    const totalBalances = tokenAddresses.length + 1; // Native balance is always collected

    const balanceCollector = await viem.deployContract('BalanceCollector2');

    return {
      publicClient,
      walletClients,
      tokens,
      tokenAddresses,
      totalBalances,
      balanceCollector,
    };
  }

  it('Should collect empty balances', async function () {
    const { tokenAddresses, totalBalances, balanceCollector } = await loadFixture(deployFixture);

    // Account with: no native balance, no token balances
    const account = '0xdeadc0dedeadc0dedeadc0dedeadc0dedeadc0de';

    const balances = await balanceCollector.read.getBalances([account, tokenAddresses]);
    expect(balances.length).equal(0);

    const uBalances = uncompressBalances(balances, totalBalances);
    expect(uBalances.length).equal(totalBalances);
    for (let i = 0; i < uBalances.length; i++) {
      expect(uBalances[i]).equal(0n);
    }
  });

  it('Should collect empty token balances and some native', async function () {
    const { tokenAddresses, totalBalances, balanceCollector, walletClients, publicClient } = await loadFixture(deployFixture);

    // Account with: some native balance, no token balances
    const account = walletClients[1].account.address;

    const balances = await balanceCollector.read.getBalances([account, tokenAddresses]);
    expect(balances.length).equal(1);
    expect(balances[0]).equal(await publicClient.getBalance({ address: account }));

    const uBalances = uncompressBalances(balances, totalBalances);
    expect(uBalances.length).equal(totalBalances);
    expect(uBalances[0]).equal(await publicClient.getBalance({ address: account }));
    for (let i = 1; i < uBalances.length; i++) {
      expect(uBalances[i]).equal(0n);
    }
  });

  it('Should collect some token balances and some native', async function () {
    const { publicClient, walletClients, tokens, tokenAddresses, totalBalances, balanceCollector } = await loadFixture(deployFixture);

    // Account with: some native balance, some token balances (#0, #5)
    const account = walletClients[1].account.address;

    // Other account: some native balance, some token balances (#0)
    const otherAccount = walletClients[2].account.address;

    await tokens[0].write.mint([account, 12_345_678n]);
    await tokens[0].write.mint([otherAccount, 31_373_137n]);
    await tokens[5].write.mint([account, 444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444n]); // 248 bit

    const balances = await balanceCollector.read.getBalances([account, tokenAddresses]);
    expect(balances.length).equal(4);
    expect(balances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(balances[1]).equal(12_345_678n);
    expect(balances[2]).equal(0x0003_000000000000000000000000000000000000000000000000000000000000n); // 0 (#1) + 0 x3 (#2, #3, #4)
    expect(balances[3]).equal(0x0000_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn); // MAX_BALANCE (#5), no repeat

    const uBalances = uncompressBalances(balances, totalBalances);
    expect(uBalances.length).equal(totalBalances);
    expect(uBalances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(uBalances[1]).equal(12_345_678n);
    for (let i = 2; i < 6; i++) {
      expect(uBalances[i]).equal(0n);
    }
    expect(uBalances[6]).equal(MAX_BALANCE); // #5 + native
    for (let i = 7; i < totalBalances; i++) {
      expect(uBalances[i]).equal(0n);
    }
  });

  it('Should collect some token balances and some native w/ bad token', async function () {
    const { publicClient, walletClients, tokens, tokenAddresses, totalBalances, balanceCollector } = await loadFixture(deployFixture);

    // Account with: some native balance, some token balances (#0, #5)
    const account = walletClients[1].account.address;

    // Other account: some native balance, some token balances (#0)
    const otherAccount = walletClients[2].account.address;

    await tokens[0].write.mint([account, 12_345_678n]);
    await tokens[0].write.mint([otherAccount, 31_373_137n]);
    await tokens[5].write.mint([account, 444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444n]); // 248 bit

    expect(tokenAddresses.length).greaterThan(12);
    const tokenAddressesWithBad = [...tokenAddresses];
    tokenAddressesWithBad.push(tokenAddressesWithBad[12]);
    tokenAddressesWithBad[12] = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const balances = await balanceCollector.read.getBalances([account, tokenAddressesWithBad]);
    expect(balances.length).equal(6);
    expect(balances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(balances[1]).equal(12_345_678n);
    expect(balances[2]).equal(0x0003_000000000000000000000000000000000000000000000000000000000000n); // 0 (#1) + 0 x3 (#2, #3, #4)
    expect(balances[3]).equal(0x0000_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn); // MAX_BALANCE (#5), no repeat
    expect(balances[4]).equal(0x0005_000000000000000000000000000000000000000000000000000000000000n); // 0 (#6) + 0 x5 (#7, #8, #9, #10, #11)
    expect(balances[5]).equal(0x0000_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn); // ERROR_BALANCE (#12), no repeat

    const uBalances = uncompressBalances(balances, totalBalances);
    expect(uBalances.length).equal(totalBalances);
    expect(uBalances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(uBalances[1]).equal(12_345_678n);
    for (let i = 2; i < 6; i++) {
      expect(uBalances[i]).equal(0n);
    }
    expect(uBalances[6]).equal(MAX_BALANCE); // #5 + native
    for (let i = 7; i < 13; i++) {
      expect(uBalances[i]).equal(0n);
    }
    expect(uBalances[13]).equal(ERROR_BALANCE); // #12 + native
    for (let i = 14; i < totalBalances; i++) {
      expect(uBalances[i]).equal(0n);
    }
  });

  it('Should collect some token balances and no native w/ bad token, w/ trailing balance', async function () {
    const { publicClient, walletClients, tokens, tokenAddresses, totalBalances, balanceCollector } = await loadFixture(deployFixture);

    // Account with: some native balance, some token balances (#0, #5)
    const account = walletClients[1].account.address;

    // Other account: some native balance, some token balances (#0)
    const otherAccount = walletClients[2].account.address;

    expect(tokenAddresses.length).equal(16);
    await tokens[0].write.mint([account, 12_345_678n]);
    await tokens[0].write.mint([otherAccount, 31_373_137n]);
    await tokens[5].write.mint([account, 444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444_444n]); // 248 bit
    await tokens[13].write.mint([account, ERROR_BALANCE - 1n]);
    await tokens[14].write.mint([account, ERROR_BALANCE]);
    await tokens[15].write.mint([account, ERROR_BALANCE + 1n]);
    await tokens[15].write.mint([otherAccount, 880_088_008_800n]);

    const tokenAddressesWithBad = [...tokenAddresses];
    tokenAddressesWithBad.push(tokenAddressesWithBad[12]);
    tokenAddressesWithBad[12] = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const balances = await balanceCollector.read.getBalances([account, tokenAddressesWithBad]);
    expect(balances.length).equal(7);
    expect(balances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(balances[1]).equal(12_345_678n);
    expect(balances[2]).equal(0x0003_000000000000000000000000000000000000000000000000000000000000n); // 0 (#1) + 0 x3 (#2, #3, #4)
    expect(balances[3]).equal(0x0000_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn); // MAX_BALANCE (#5), no repeat
    expect(balances[4]).equal(0x0005_000000000000000000000000000000000000000000000000000000000000n); // 0 (#6) + 0 x5 (#7, #8, #9, #10, #11)
    expect(balances[5]).equal(0x0000_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn); // ERROR_BALANCE (#12), no repeat
    expect(balances[6]).equal(0x0002_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEn); // MAX_BALANCE (#13) + MAX_BALANCE x2 (#14, #15)

    const uBalances = uncompressBalances(balances, totalBalances);
    expect(uBalances.length).equal(totalBalances);
    expect(uBalances[0]).equal(await publicClient.getBalance({ address: account }));
    expect(uBalances[1]).equal(12_345_678n);
    for (let i = 2; i < 6; i++) {
      expect(uBalances[i]).equal(0n);
    }
    expect(uBalances[6]).equal(MAX_BALANCE); // #5 + native
    for (let i = 7; i < 13; i++) {
      expect(uBalances[i]).equal(0n);
    }
    expect(uBalances[13]).equal(ERROR_BALANCE); // #12 + native
    for (let i = 14; i < totalBalances; i++) {
      expect(uBalances[i]).equal(MAX_BALANCE);
    }
  });
});
