// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IGroth16Verifier } from "./IGroth16Verifier.sol";

contract MockGroth16Verifier is IGroth16Verifier {
    bool public shouldVerify = true;

    function setShouldVerify(bool value) external {
        shouldVerify = value;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external view override returns (bool) {
        return shouldVerify;
    }
}
