// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.27;

import {ERC20Permit, ERC20} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract TestToken is ERC20Permit {
    error TestBalanceOfError();

    string private constant NAME = "Generic Test";
    string private constant SYMBOL = "GENT";

    bool private shouldRevertBalanceOf = false;

    constructor()
        ERC20(NAME, SYMBOL)
        ERC20Permit(NAME)
    {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account_, uint256 amount_) external virtual {
        _mint(account_, amount_);
    }

    function balanceOf(address account_) public view override returns (uint256) {
        if (shouldRevertBalanceOf) revert TestBalanceOfError();
        return super.balanceOf(account_);
    }

    function setRevertBalanceOf(bool shouldRevert_) external {
        shouldRevertBalanceOf = shouldRevert_;
    }
}
