// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGroth16Verifier3
 * @dev Interface for Groth16 verifiers with 3 public signals
 *      Used by: score_threshold, age_verification circuits
 */
interface IGroth16Verifier3 {
    function verifyProof(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[3] calldata pubSignals
    ) external view returns (bool);
}

/**
 * @title IGroth16Verifier5
 * @dev Interface for Groth16 verifiers with 5 public signals
 *      Used by: cross_vertical_aggregate circuit
 */
interface IGroth16Verifier5 {
    function verifyProof(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[5] calldata pubSignals
    ) external view returns (bool);
}
