// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.8.19;

contract Groth16Verifier {
    // Scalar field size
    uint256 public constant R = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 public constant Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 public constant ALPHA_X = 13922274684246045234695603352388770730452742575390994235818746790957035068359;
    uint256 public constant ALPHA_Y = 15161524235854981008386854720014459033897331318953047928183327459142846472767;
    uint256 public constant BETA_X1 = 19398279571945240006525453487880825063243220344445551288910566929913105451960;
    uint256 public constant BETA_X2 = 1876404315061094941894795245219464118434563766754129140184479223787311298095;
    uint256 public constant BETA_Y1 = 5106631744190764257137398804563144237303377887089529728599897272351755898326;
    uint256 public constant BETA_Y2 = 5171832838703269063294953452270987895099724749787821585041656799806402058928;
    uint256 public constant GAMMA_X1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 public constant GAMMA_X2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 public constant GAMMA_Y1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 public constant GAMMA_Y2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 public constant DELTA_X1 = 16457014863406145301633705564847632700438627233275238065552609385121216131732;
    uint256 public constant DELTA_X2 = 12217182757266600827423697594640230037380822539966171001405564210455667141206;
    uint256 public constant DELTA_Y1 = 20423487389903502899167183532423181039658608186888232490744312378515551698352;
    uint256 public constant DELTA_Y2 = 18856530047911489012057140723926935947461506549734949533867892606753083461715;

    
    uint256 public constant IC_0_X = 13373253801379833309606993789461671554686706122185528051264785453816578362244;
    uint256 public constant IC_0_Y = 4246398252831889884204322251863303355749131111181216292247496508621653531472;
    
    uint256 public constant IC_1_X = 552325656132488110326383581545686630290723547241714874415978769202377523144;
    uint256 public constant IC_1_Y = 858176367780616613204187923163650893875372940839596805002117214404854304099;
    
    uint256 public constant IC_2_X = 18611500149357586006227782415087546642034750197110802176045604654014644560150;
    uint256 public constant IC_2_Y = 3771101677421136615778094756693014003948735312511245589639933317323656054009;
    
    uint256 public constant IC_3_X = 18475806686582367087009968316614787285308042345790267958927216092514036193858;
    uint256 public constant IC_3_Y = 18014903305630495441202230482788456336514710071831907454974417232732906990706;
    
 
    // Memory data
    uint16 public constant P_VK = 0;
    uint16 public constant P_PAIRING = 128;

    uint16 public constant P_LAST_MEM = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[3] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, R)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, P_PAIRING)
                let _pVk := add(pMem, P_VK)

                mstore(_pVk, IC_0_X)
                mstore(add(_pVk, 32), IC_0_Y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC_1_X, IC_1_Y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC_2_X, IC_2_Y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC_3_X, IC_3_Y, calldataload(add(pubSignals, 64)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(Q, calldataload(add(pA, 32))), Q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), ALPHA_X)
                mstore(add(_pPairing, 224), ALPHA_Y)

                // beta2
                mstore(add(_pPairing, 256), BETA_X1)
                mstore(add(_pPairing, 288), BETA_X2)
                mstore(add(_pPairing, 320), BETA_Y1)
                mstore(add(_pPairing, 352), BETA_Y2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, P_VK)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(P_VK, 32))))


                // gamma2
                mstore(add(_pPairing, 448), GAMMA_X1)
                mstore(add(_pPairing, 480), GAMMA_X2)
                mstore(add(_pPairing, 512), GAMMA_Y1)
                mstore(add(_pPairing, 544), GAMMA_Y2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), DELTA_X1)
                mstore(add(_pPairing, 672), DELTA_X2)
                mstore(add(_pPairing, 704), DELTA_Y1)
                mstore(add(_pPairing, 736), DELTA_Y2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, P_LAST_MEM))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
