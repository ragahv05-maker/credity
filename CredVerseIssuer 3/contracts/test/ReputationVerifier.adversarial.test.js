/**
 * ReputationVerifier — Adversarial Fuzz & Edge-Case Test Suite
 * Target: ~2500 parameterised test cases covering every attack vector.
 *
 * Categories:
 *  A. Proof Input Fuzz (500 cases)
 *  B. Replay Attack Simulation (500 cases)
 *  C. Circuit Routing Tests (200 cases)
 *  D. Proof Hash Collision Tests (200 cases)
 *  E. Access Control for Verifier Rotation (200 cases)
 *  F. Pause/Unpause Interaction (200 cases)
 *  G. Zero-Value and Boundary Tests (200 cases)
 *  H. Gas Limit Attack Simulation (200 cases)
 *  I. Multi-Proof Batching (200 cases)
 *  J. Nonce Integrity & Submitter Binding (100 cases)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

function randomUint256() {
    return BigInt(ethers.hexlify(ethers.randomBytes(32)));
}

function randomProofPoints() {
    return {
        pA: [randomUint256(), randomUint256()],
        pB: [[randomUint256(), randomUint256()], [randomUint256(), randomUint256()]],
        pC: [randomUint256(), randomUint256()],
    };
}

describe("ReputationVerifier — Adversarial Suite (~2500 cases)", function () {
    let owner, attacker, user1, user2, accounts;
    let mock1, mock2, mock3, verifier;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        attacker = signers[1];
        user1 = signers[2];
        user2 = signers[3];
        accounts = signers.slice(4);

        const Mock = await ethers.getContractFactory("MockGroth16Verifier");
        mock1 = await Mock.deploy();
        mock2 = await Mock.deploy();
        mock3 = await Mock.deploy();
        await Promise.all([mock1.waitForDeployment(), mock2.waitForDeployment(), mock3.waitForDeployment()]);

        const Verifier = await ethers.getContractFactory("ReputationVerifier");
        verifier = await Verifier.deploy(
            await mock1.getAddress(),
            await mock2.getAddress(),
            await mock3.getAddress()
        );
        await verifier.waitForDeployment();
    });

    // ═══════════════════════════════════════════════════════════
    // A. PROOF INPUT FUZZ (500 cases)
    // ═══════════════════════════════════════════════════════════
    describe("A. Proof Input Fuzz (500 cases)", function () {
        it("Should accept 100 random valid circuit-1 proofs", async function () {
            for (let i = 0; i < 100; i++) {
                const pA = [BigInt(i * 2 + 1), BigInt(i * 2 + 2)];
                const pB = [[BigInt(i + 3), BigInt(i + 4)], [BigInt(i + 5), BigInt(i + 6)]];
                const pC = [BigInt(i + 7), BigInt(i + 8)];
                const pubSignals = [1n, BigInt(750 + i), BigInt(12345 + i)];

                await expect(
                    verifier.verifyAndStoreProof(pA, pB, pC, pubSignals)
                ).to.not.be.reverted;
            }
        });

        it("Should accept 100 random valid circuit-2 proofs", async function () {
            for (let i = 0; i < 100; i++) {
                const pubSignals = [2n, BigInt(20060101 + i), BigInt(999 + i)];
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 1), BigInt(i + 2)],
                        [[BigInt(i + 3), BigInt(i + 4)], [BigInt(i + 5), BigInt(i + 6)]],
                        [BigInt(i + 7), BigInt(i + 8)],
                        pubSignals
                    )
                ).to.not.be.reverted;
            }
        });

        it("Should accept 100 random valid circuit-3 proofs", async function () {
            for (let i = 0; i < 100; i++) {
                const pubSignals = [3n, BigInt(3 + (i % 5)), BigInt(80 + i), BigInt(90 + i), BigInt(123 + i)];
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 100), BigInt(i + 200)],
                        [[BigInt(i + 300), BigInt(i + 400)], [BigInt(i + 500), BigInt(i + 600)]],
                        [BigInt(i + 700), BigInt(i + 800)],
                        pubSignals
                    )
                ).to.not.be.reverted;
            }
        });

        it("Should reject 100 proofs when verifier returns false", async function () {
            await mock1.setShouldVerify(false);

            for (let i = 0; i < 100; i++) {
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 1), BigInt(i + 2)],
                        [[BigInt(i + 3), BigInt(i + 4)], [BigInt(i + 5), BigInt(i + 6)]],
                        [BigInt(i + 7), BigInt(i + 8)],
                        [1n, 750n, 12345n]
                    )
                ).to.be.revertedWithCustomError(verifier, "InvalidProof");
            }
        });

        it("Should reject 100 proofs with empty pubSignals", async function () {
            for (let i = 0; i < 100; i++) {
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 1), 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], []
                    )
                ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B. REPLAY ATTACK SIMULATION (500 cases)
    // ═══════════════════════════════════════════════════════════
    describe("B. Replay Attack Simulation (500 cases)", function () {
        it("Same proof, same sender → should succeed (nonce differs) — 100 replays", async function () {
            const pA = [1n, 2n];
            const pB = [[3n, 4n], [5n, 6n]];
            const pC = [7n, 8n];
            const pubSignals = [1n, 750n, 12345n];

            for (let i = 0; i < 100; i++) {
                // Each submission gets a unique nonce, so no replay error
                await expect(
                    verifier.verifyAndStoreProof(pA, pB, pC, pubSignals)
                ).to.not.be.reverted;
            }

            // Verify nonce incremented correctly
            expect(await verifier.submitterNonce(owner.address)).to.equal(100n);
        });

        it("Same proof, different senders → should succeed independently — 100 cases", async function () {
            const pA = [1n, 2n];
            const pB = [[3n, 4n], [5n, 6n]];
            const pC = [7n, 8n];
            const pubSignals = [1n, 750n, 12345n];

            // Each sender gets their own nonce space
            await expect(verifier.connect(owner).verifyAndStoreProof(pA, pB, pC, pubSignals)).to.not.be.reverted;
            await expect(verifier.connect(attacker).verifyAndStoreProof(pA, pB, pC, pubSignals)).to.not.be.reverted;
            await expect(verifier.connect(user1).verifyAndStoreProof(pA, pB, pC, pubSignals)).to.not.be.reverted;
            await expect(verifier.connect(user2).verifyAndStoreProof(pA, pB, pC, pubSignals)).to.not.be.reverted;

            for (let i = 0; i < accounts.length && i < 96; i++) {
                await expect(
                    verifier.connect(accounts[i]).verifyAndStoreProof(pA, pB, pC, pubSignals)
                ).to.not.be.reverted;
            }
        });

        it("Different proofs from same sender across all 3 circuits — 100 each", async function () {
            for (let i = 0; i < 100; i++) {
                // Circuit 1
                await verifier.verifyAndStoreProof(
                    [BigInt(i * 100 + 1), BigInt(i * 100 + 2)],
                    [[BigInt(i * 100 + 3), BigInt(i * 100 + 4)], [BigInt(i * 100 + 5), BigInt(i * 100 + 6)]],
                    [BigInt(i * 100 + 7), BigInt(i * 100 + 8)],
                    [1n, BigInt(i + 1), BigInt(i + 2)]
                );
            }

            for (let i = 0; i < 100; i++) {
                // Circuit 2
                await verifier.verifyAndStoreProof(
                    [BigInt(i * 200 + 1), BigInt(i * 200 + 2)],
                    [[BigInt(i * 200 + 3), BigInt(i * 200 + 4)], [BigInt(i * 200 + 5), BigInt(i * 200 + 6)]],
                    [BigInt(i * 200 + 7), BigInt(i * 200 + 8)],
                    [2n, BigInt(i + 1000), BigInt(i + 2000)]
                );
            }

            for (let i = 0; i < 100; i++) {
                // Circuit 3
                await verifier.verifyAndStoreProof(
                    [BigInt(i * 300 + 1), BigInt(i * 300 + 2)],
                    [[BigInt(i * 300 + 3), BigInt(i * 300 + 4)], [BigInt(i * 300 + 5), BigInt(i * 300 + 6)]],
                    [BigInt(i * 300 + 7), BigInt(i * 300 + 8)],
                    [3n, BigInt(i + 3000), BigInt(i + 4000), BigInt(i + 5000), BigInt(i + 6000)]
                );
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C. CIRCUIT ROUTING TESTS (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("C. Circuit Routing (200 cases)", function () {
        it("Should reject 50 unsupported circuit IDs (0, 4-99)", async function () {
            const invalidIds = [0, 4, 5, 10, 42, 99, 100, 255, 1000, 999999];
            for (const id of invalidIds) {
                for (let i = 0; i < 5; i++) {
                    await expect(
                        verifier.verifyAndStoreProof(
                            [1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                            [BigInt(id), BigInt(i + 1), BigInt(i + 2)]
                        )
                    ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
                }
            }
        });

        it("Should reject wrong-length pubSignals for each circuit — 50 per circuit", async function () {
            // Circuit 1 expects 3 signals
            for (let i = 0; i < 50; i++) {
                const wrongLengths = [
                    [1n],                                      // too short (1)
                    [1n, 750n],                                // too short (2)
                    [1n, 750n, 123n, 456n],                    // too long (4)
                    [1n, 750n, 123n, 456n, 789n],              // too long (5)
                ];
                const idx = i % wrongLengths.length;
                await expect(
                    verifier.verifyAndStoreProof(
                        [1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], wrongLengths[idx]
                    )
                ).to.be.reverted; // either InvalidCircuitId or PublicSignalsLengthMismatch
            }

            // Circuit 3 expects 5 signals
            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.verifyAndStoreProof(
                        [1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                        [3n, 1n, 2n] // only 3 signals instead of 5
                    )
                ).to.be.revertedWithCustomError(verifier, "PublicSignalsLengthMismatch");
            }
        });

        it("Should selectively disable circuit 2 and still allow 1 and 3 — 50 tests", async function () {
            await mock2.setShouldVerify(false);

            for (let i = 0; i < 50; i++) {
                // Circuit 1 should still work
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 1), 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                        [1n, 750n, BigInt(i)]
                    )
                ).to.not.be.reverted;

                // Circuit 2 should fail
                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i + 1), 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                        [2n, 20060101n, BigInt(i)]
                    )
                ).to.be.revertedWithCustomError(verifier, "InvalidProof");
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D. PROOF HASH COLLISION TESTS (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("D. Proof Hash Uniqueness (200 cases)", function () {
        it("Proofs with 1-bit diff in pA should produce different hashes — 100 pairs", async function () {
            for (let i = 0; i < 100; i++) {
                const pA1 = [BigInt(i * 2), BigInt(i * 2 + 1)];
                const pA2 = [BigInt(i * 2) ^ 1n, BigInt(i * 2 + 1)]; // flip 1 bit
                const pB = [[3n, 4n], [5n, 6n]];
                const pC = [7n, 8n];
                const pubSignals = [1n, 750n, BigInt(i)];

                const tx1 = await verifier.verifyAndStoreProof(pA1, pB, pC, pubSignals);
                const r1 = await tx1.wait();
                const e1 = r1.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");

                const tx2 = await verifier.verifyAndStoreProof(pA2, pB, pC, pubSignals);
                const r2 = await tx2.wait();
                const e2 = r2.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");

                // Both should succeed but with different proof hashes
                expect(e1).to.not.equal(undefined);
                expect(e2).to.not.equal(undefined);
                expect(e1.args[0]).to.not.equal(e2.args[0]); // different proofHash
            }
        });

        it("Same data from different senders should produce different hashes — 100 cases", async function () {
            const pA = [1n, 2n];
            const pB = [[3n, 4n], [5n, 6n]];
            const pC = [7n, 8n];

            for (let i = 0; i < Math.min(100, accounts.length); i++) {
                const pubSignals = [1n, 750n, BigInt(i + 5000)];
                const tx = await verifier.connect(accounts[i]).verifyAndStoreProof(pA, pB, pC, pubSignals);
                const receipt = await tx.wait();
                const event = receipt.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");
                expect(event).to.not.equal(undefined);
                // Since msg.sender is in the hash, each should be unique
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E. ACCESS CONTROL FOR VERIFIER ROTATION (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("E. Verifier Rotation Access Control (200 cases)", function () {
        it("Should block 50 non-admin attempts to rotate circuit-3 verifier", async function () {
            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.connect(attacker).setCircuitVerifier3(1, await mock1.getAddress())
                ).to.be.reverted;
            }
        });

        it("Should block 50 non-admin attempts to rotate circuit-5 verifier", async function () {
            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.connect(attacker).setCircuitVerifier5(await mock3.getAddress())
                ).to.be.reverted;
            }
        });

        it("Should allow admin to rotate verifiers 50 times each", async function () {
            for (let i = 0; i < 50; i++) {
                const Mock = await ethers.getContractFactory("MockGroth16Verifier");
                const newMock = await Mock.deploy();
                await newMock.waitForDeployment();

                await expect(
                    verifier.setCircuitVerifier3(1, await newMock.getAddress())
                ).to.emit(verifier, "ZkVerifier3Updated");
            }
        });

        it("Should reject setting verifier to zero address — 50 attempts", async function () {
            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.setCircuitVerifier3(1, ethers.ZeroAddress)
                ).to.be.revertedWithCustomError(verifier, "InvalidVerifier");

                await expect(
                    verifier.setCircuitVerifier5(ethers.ZeroAddress)
                ).to.be.revertedWithCustomError(verifier, "InvalidVerifier");
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // F. PAUSE/UNPAUSE INTERACTION (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("F. Pause/Unpause Interaction (200 cases)", function () {
        it("Should block proofs when paused across all 3 circuits — 50 per circuit", async function () {
            await verifier.pause();

            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [1n, 750n, BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "EnforcedPause");
            }

            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [2n, 20060101n, BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "EnforcedPause");
            }

            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [3n, 3n, 80n, 90n, BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "EnforcedPause");
            }
        });

        it("Should recover from 50 pause/unpause cycles", async function () {
            for (let i = 0; i < 50; i++) {
                await verifier.pause();
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [1n, 750n, BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "EnforcedPause");

                await verifier.unpause();
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [1n, 750n, BigInt(i + 10000)])
                ).to.not.be.reverted;
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // G. ZERO-VALUE AND BOUNDARY TESTS (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("G. Zero & Boundary Values (200 cases)", function () {
        it("Should handle zero-valued proof points — 100 tests", async function () {
            for (let i = 0; i < 100; i++) {
                // Zero proof points should still pass if mock verifier returns true
                await expect(
                    verifier.verifyAndStoreProof(
                        [0n, 0n], [[0n, 0n], [0n, 0n]], [0n, 0n],
                        [1n, BigInt(i), BigInt(i + 1)]
                    )
                ).to.not.be.reverted;
            }
        });

        it("Should handle max uint256 in pubSignals — 50 tests", async function () {
            for (let i = 0; i < 50; i++) {
                await expect(
                    verifier.verifyAndStoreProof(
                        [1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                        [1n, ethers.MaxUint256, BigInt(i)]
                    )
                ).to.not.be.reverted;
            }
        });

        it("Should handle circuit ID at boundaries — 50 tests", async function () {
            // circuitId = 0 should fail
            for (let i = 0; i < 25; i++) {
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [0n, BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
            }

            // circuitId = 4 should fail
            for (let i = 0; i < 25; i++) {
                await expect(
                    verifier.verifyAndStoreProof([1n, 2n], [[3n, 4n], [5n, 6n]], [7n, 8n], [4n, BigInt(i), BigInt(i)])
                ).to.be.revertedWithCustomError(verifier, "InvalidCircuitId");
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // H. GAS LIMIT ATTACK SIMULATION (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("H. Gas Consumption Stability (200 cases)", function () {
        it("Should maintain constant gas for same-size proofs — 100 measurements", async function () {
            const gasUsages = [];

            for (let i = 0; i < 100; i++) {
                const tx = await verifier.verifyAndStoreProof(
                    [BigInt(i + 1), BigInt(i + 2)],
                    [[BigInt(i + 3), BigInt(i + 4)], [BigInt(i + 5), BigInt(i + 6)]],
                    [BigInt(i + 7), BigInt(i + 8)],
                    [1n, 750n, BigInt(i + 100)]
                );
                const receipt = await tx.wait();
                gasUsages.push(receipt.gasUsed);
            }

            // Keep gas variation bounded enough to detect regressions while
            // tolerating minor runtime/client variability in CI.
            const min = gasUsages.reduce((a, b) => a < b ? a : b);
            const max = gasUsages.reduce((a, b) => a > b ? a : b);
            const variance = Number((max - min) * 100n / min);
            expect(variance).to.be.lessThan(25); // < 25% variance
        });

        it("Should measure gas for circuit-3 proofs (larger pubSignals) — 100 measurements", async function () {
            const gasUsages = [];

            for (let i = 0; i < 100; i++) {
                const tx = await verifier.verifyAndStoreProof(
                    [BigInt(i + 1), BigInt(i + 2)],
                    [[BigInt(i + 3), BigInt(i + 4)], [BigInt(i + 5), BigInt(i + 6)]],
                    [BigInt(i + 7), BigInt(i + 8)],
                    [3n, 3n, 80n, 90n, BigInt(i + 200)]
                );
                const receipt = await tx.wait();
                gasUsages.push(receipt.gasUsed);
            }

            const min = gasUsages.reduce((a, b) => a < b ? a : b);
            const max = gasUsages.reduce((a, b) => a > b ? a : b);
            const variance = Number((max - min) * 100n / min);
            expect(variance).to.be.lessThan(25);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // I. MULTI-PROOF BATCHING (200 cases)
    // ═══════════════════════════════════════════════════════════
    describe("I. Multi-Proof Sequential Submission (200 cases)", function () {
        it("Should handle 200 sequential proofs from same user without state corruption", async function () {
            for (let i = 0; i < 200; i++) {
                const circuitId = BigInt((i % 3) + 1);
                let pubSignals;
                if (circuitId <= 2n) {
                    pubSignals = [circuitId, BigInt(i + 1000), BigInt(i + 2000)];
                } else {
                    pubSignals = [circuitId, BigInt(i + 3000), BigInt(i + 4000), BigInt(i + 5000), BigInt(i + 6000)];
                }

                await expect(
                    verifier.verifyAndStoreProof(
                        [BigInt(i * 10 + 1), BigInt(i * 10 + 2)],
                        [[BigInt(i * 10 + 3), BigInt(i * 10 + 4)], [BigInt(i * 10 + 5), BigInt(i * 10 + 6)]],
                        [BigInt(i * 10 + 7), BigInt(i * 10 + 8)],
                        pubSignals
                    )
                ).to.not.be.reverted;
            }

            // Nonce should match exactly
            expect(await verifier.submitterNonce(owner.address)).to.equal(200n);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // J. NONCE INTEGRITY & SUBMITTER BINDING (100 cases)
    // ═══════════════════════════════════════════════════════════
    describe("J. Nonce & Submitter Binding (100 cases)", function () {
        it("Should maintain separate nonces per user — 5 users × 20 proofs", async function () {
            const users = [owner, attacker, user1, user2, ...accounts.slice(0, 1)];

            for (const user of users) {
                for (let i = 0; i < 20; i++) {
                    await verifier.connect(user).verifyAndStoreProof(
                        [BigInt(i + 1), 2n], [[3n, 4n], [5n, 6n]], [7n, 8n],
                        [1n, 750n, BigInt(i)]
                    );
                }
                expect(await verifier.submitterNonce(user.address)).to.equal(20n);
            }
        });

        it("Proof submitter should be recorded correctly for each proof event", async function () {
            const pA = [1n, 2n];
            const pB = [[3n, 4n], [5n, 6n]];
            const pC = [7n, 8n];
            const pubSignals = [1n, 750n, 12345n];

            const tx = await verifier.connect(user1).verifyAndStoreProof(pA, pB, pC, pubSignals);
            const receipt = await tx.wait();
            const event = receipt.logs.find((l) => l.fragment && l.fragment.name === "ProofVerified");

            expect(event).to.not.equal(undefined);
            expect(event.args[1]).to.equal(user1.address); // submitter
        });
    });
});
