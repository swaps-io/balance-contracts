// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BalanceCollector2 {
    uint256 private constant BALANCE_BITS = 240;
    uint256 private constant BALANCE_MASK = (1 << BALANCE_BITS) - 1;
    uint256 private constant ERROR_BALANCE = BALANCE_MASK;
    uint256 private constant MAX_BALANCE = BALANCE_MASK - 1;
    uint256 private constant REPEAT_INCREMENT = 1 << BALANCE_BITS;

    function getBalances(address account_, address[] calldata tokens_) external view returns (uint256[] memory balances) {
        unchecked {
            balances = new uint256[](tokens_.length + 1);

            // Assumes native balance > MAX_BALANCE is impossible
            uint256 previousBalance = account_.balance;
            balances[0] = previousBalance;

            uint256 balancesCursor = 1;
            for (uint256 i = 0; i < tokens_.length; i++) {
                address token = tokens_[i];

                uint256 balance;
                if (token.code.length == 0) {
                    balance = ERROR_BALANCE;
                } else {
                    try IERC20(token).balanceOf(account_) returns (uint256 balanceOf) {
                        balance = balanceOf > MAX_BALANCE ? MAX_BALANCE : balanceOf;
                    } catch {
                        balance = ERROR_BALANCE;
                    }
                }

                if (balance == (previousBalance & BALANCE_MASK)) {
                    // Assumes 2 ** (256 - BALANCE_BITS) repeats are impossible
                    previousBalance += REPEAT_INCREMENT;
                    balances[balancesCursor - 1] = previousBalance;
                } else {
                    balances[balancesCursor] = balance;
                    balancesCursor++;
                    previousBalance = balance;
                }
            }

            // Trim zero balances from the end
            if ((previousBalance & BALANCE_MASK) == 0) {
                balancesCursor--;
            }

            assembly { mstore(balances, balancesCursor) }
        }
    }
}
