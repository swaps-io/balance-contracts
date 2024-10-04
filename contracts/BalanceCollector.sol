// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BalanceCollector {
    error TooManyTokens(uint256 tokens, uint256 maxTokens);

    uint256 private constant MAX_TOKENS = (1 << 15) - 1;
    uint256 private constant MAX_BALANCE = (1 << 255) - 1;
    uint256 private constant MAX_BALANCE_SKIP = (1 << 240) - 1;
    uint256 private constant SKIP_BIT = (1 << 255);

    function getBalances(address account_, address[] calldata tokens_) external view returns (uint256[] memory balances) {
        if (tokens_.length > MAX_TOKENS) revert TooManyTokens(tokens_.length, MAX_TOKENS);

        balances = new uint256[](tokens_.length + 1);
        balances[0] = account_.balance;

        uint256 balancesCursor = 1;
        uint256 tokensSkipped = 0;
        for (uint256 i = 0; i < tokens_.length; i++) {
            uint256 balance = _getBalance(account_, tokens_[i]);
            if (balance == 0) {
                unchecked { tokensSkipped++; }
                continue;
            }

            if (tokensSkipped == 0) {
                if (balance > MAX_BALANCE) {
                    balance = MAX_BALANCE;
                }
            } else {
                if (balance > MAX_BALANCE_SKIP) {
                    balance = MAX_BALANCE_SKIP;
                }
                balance |= tokensSkipped << 240;
                balance |= SKIP_BIT;
                tokensSkipped = 0;
            }

            balances[balancesCursor] = balance;
            unchecked { balancesCursor++; }
        }

        assembly { mstore(balances, balancesCursor) }
    }

    function _getBalance(address account_, address token_) private view returns (uint256) {
        if (token_.code.length == 0) {
            return 0;
        }

        try IERC20(token_).balanceOf(account_) returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }
}
