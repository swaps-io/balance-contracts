import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const BalanceCollector = buildModule('BalanceCollector', (m) => {
  const balanceCollector = m.contract('BalanceCollector');
  return { balanceCollector };
});

export default BalanceCollector;
