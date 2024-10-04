import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';

describe('BalanceCollectorTest', function () {
  async function deployFixture() {
    const publicClient = await viem.getPublicClient();
    const walletClients = await viem.getWalletClients();

    const tokens = [];
    for (let i = 0; i < 16; i++) {
      const token = await viem.deployContract('TestToken');
      tokens.push(token);
    }

    const balanceCollector = await viem.deployContract('BalanceCollector');

    return {
      publicClient,
      walletClients,
      tokens,
      balanceCollector,
    };
  }

  it('Should collect empty balances', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(1);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
  });

  it('Should collect first balance only', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[0].write.mint([walletClients[1].account.address, 12_345_678n]);
    await tokens[0].write.mint([walletClients[2].account.address, 31_373_137n]);

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(2);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(12_345_678n);
  });

  it('Should collect second balance with skip', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[1].write.mint([walletClients[1].account.address, 12_345_678n]);
    await tokens[1].write.mint([walletClients[2].account.address, 31_373_137n]);

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(2);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(12_345_678n | (0b1000_0000_0000_0001n << 240n));
  });

  it('Should collect last balance with skip', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[3].write.mint([walletClients[1].account.address, 12_345_678n]);
    await tokens[3].write.mint([walletClients[2].account.address, 31_373_137n]);

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(2);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(12_345_678n | (0b1000_0000_0000_0011n << 240n));
  });

  it('Should collect balances with mixed skip', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[0].write.mint([walletClients[1].account.address, 12_345_678n]); // 1
    await tokens[2].write.mint([walletClients[1].account.address, 31_373_137n]); // 2
    await tokens[3].write.mint([walletClients[1].account.address, 69_966_996n]); // 3
    await tokens[10].write.mint([walletClients[1].account.address, 111_111n]); // 4
    await tokens[11].write.mint([walletClients[1].account.address, 222_222n]); // 5
    await tokens[14].write.mint([walletClients[1].account.address, 333_333n]); // 6
    await tokens[15].write.mint([walletClients[1].account.address, 444_444n]); // 7

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(8);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(12_345_678n);
    expect(balances[2]).to.be.equal(31_373_137n | (0b1000_0000_0000_0001n << 240n));
    expect(balances[3]).to.be.equal(69_966_996n);
    expect(balances[4]).to.be.equal(111_111n | (0b1000_0000_0000_0110n << 240n));
    expect(balances[5]).to.be.equal(222_222n);
    expect(balances[6]).to.be.equal(333_333n | (0b1000_0000_0000_0010n << 240n));
    expect(balances[7]).to.be.equal(444_444n);
  });

  it('Should return zero balance when token balanceOf reverts', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[2].write.mint([walletClients[1].account.address, 31_373_137n]); // 2

    // Make `balanceOf` view method revert
    await tokens[0].write.setRevertBalanceOf([true]);

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokens.map((t) => t.address)]);
    expect(balances.length).to.be.equal(2);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(31_373_137n | (0b1000_0000_0000_0010n << 240n)); // Skip 2 (#0 & #1) as zero
  });

  it('Should return zero balance when token contract does not exist', async function () {
    const { publicClient, walletClients, tokens, balanceCollector } = await loadFixture(deployFixture);

    await tokens[2].write.mint([walletClients[1].account.address, 31_373_137n]); // 2

    // Assign non-existent token address
    const tokenAddresses = tokens.map((t) => t.address);
    tokenAddresses[0] = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF';

    const balances = await balanceCollector.read.getBalances([walletClients[1].account.address, tokenAddresses]);
    expect(balances.length).to.be.equal(2);
    expect(balances[0]).to.be.equal(await publicClient.getBalance({ address: walletClients[1].account.address }));
    expect(balances[1]).to.be.equal(31_373_137n | (0b1000_0000_0000_0010n << 240n)); // Skip 2 (#0 & #1) as zero
  });
});
