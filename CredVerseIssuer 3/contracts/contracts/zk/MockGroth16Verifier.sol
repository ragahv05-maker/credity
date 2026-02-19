// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IGroth16Verifier3, IGroth16Verifier5 } from "./IGroth16Verifier.sol";

/**
 * @title MockGroth16Verifier
 * @dev Test-only mock that implements BOTH verifier interfaces.
 *      Access-controlled: only owner can toggle verification result.
 */
contract MockGroth16Verifier is IGroth16Verifier3, IGroth16Verifier5, Ownable {
    bool public shouldVerify = true;

    constructor() Ownable(msg.sender) {}

    function setShouldVerify(bool value) external onlyOwner {
        shouldVerify = value;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[3] calldata
    ) external view override returns (bool) {
        return shouldVerify;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[5] calldata
    ) external view override returns (bool) {
        return shouldVerify;
    }
}
