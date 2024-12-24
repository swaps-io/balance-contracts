import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const BalanceCollector2 = buildModule('BalanceCollector2', (m) => {
  const balanceCollector2 = m.contract('BalanceCollector2');
  return { balanceCollector2 };
});

export default BalanceCollector2;
