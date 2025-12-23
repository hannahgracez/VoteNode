import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedPersonalitySurvey, EncryptedPersonalitySurvey__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "EncryptedPersonalitySurvey",
  )) as EncryptedPersonalitySurvey__factory;
  const contract = (await factory.deploy()) as EncryptedPersonalitySurvey;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

async function decryptU8OrUndefined(
  contractAddress: string,
  viewer: HardhatEthersSigner,
  encrypted: string,
): Promise<number | undefined> {
  if (encrypted === ethers.ZeroHash) return undefined;
  const clear = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted, contractAddress, viewer);
  return Number(clear);
}

async function decryptU32OrZero(
  contractAddress: string,
  viewer: HardhatEthersSigner,
  encrypted: string,
): Promise<number> {
  if (encrypted === ethers.ZeroHash) return 0;
  const clear = await fhevm.userDecryptEuint(FhevmType.euint32, encrypted, contractAddress, viewer);
  return Number(clear);
}

describe("EncryptedPersonalitySurvey", function () {
  let signers: Signers;
  let contract: EncryptedPersonalitySurvey;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("starts uninitialized", async function () {
    expect(await contract.hasSubmitted(signers.alice.address)).to.eq(false);

    for (let q = 0; q < 5; q++) {
      const choice = await contract.getEncryptedChoice(signers.alice.address, q);
      expect(choice).to.eq(ethers.ZeroHash);
    }

    for (let q = 0; q < 5; q++) {
      for (let o = 0; o < 4; o++) {
        const c = await contract.getEncryptedCount(q, o);
        expect(c).to.eq(ethers.ZeroHash);
      }
    }
  });

  it("submits encrypted answers and updates encrypted counts", async function () {
    const clearAnswers = [1, 2, 3, 0, 2];
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(clearAnswers[0])
      .add8(clearAnswers[1])
      .add8(clearAnswers[2])
      .add8(clearAnswers[3])
      .add8(clearAnswers[4])
      .encrypt();

    await (
      await contract
        .connect(signers.alice)
        .submitAnswers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
          encryptedInput.inputProof,
        )
    ).wait();

    expect(await contract.hasSubmitted(signers.alice.address)).to.eq(true);

    for (let q = 0; q < 5; q++) {
      const encryptedChoice = await contract.getEncryptedChoice(signers.alice.address, q);
      const clear = await decryptU8OrUndefined(contractAddress, signers.alice, encryptedChoice);
      expect(clear).to.eq(clearAnswers[q]);
    }

    await (await contract.connect(signers.alice).allowCounts(signers.alice.address)).wait();

    for (let q = 0; q < 5; q++) {
      for (let o = 0; o < 4; o++) {
        const encryptedCount = await contract.getEncryptedCount(q, o);
        const clear = await decryptU32OrZero(contractAddress, signers.alice, encryptedCount);
        const expected = o === clearAnswers[q] ? 1 : 0;
        expect(clear).to.eq(expected);
      }
    }
  });

  it("prevents double submission", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(0)
      .add8(0)
      .add8(0)
      .add8(0)
      .add8(0)
      .encrypt();

    await (
      await contract
        .connect(signers.alice)
        .submitAnswers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
          encryptedInput.inputProof,
        )
    ).wait();

    await expect(
      contract
        .connect(signers.alice)
        .submitAnswers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
          encryptedInput.inputProof,
        ),
    ).to.be.revertedWith("Already submitted");
  });

  it("normalizes answers that exceed the per-question option count", async function () {
    // Question 0 only has 2 options; sending 3 should normalize to 0.
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add8(3)
      .add8(0)
      .add8(0)
      .add8(0)
      .add8(0)
      .encrypt();

    await (
      await contract
        .connect(signers.bob)
        .submitAnswers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
          encryptedInput.inputProof,
        )
    ).wait();

    const encryptedChoice = await contract.getEncryptedChoice(signers.bob.address, 0);
    const clearChoice = await decryptU8OrUndefined(contractAddress, signers.bob, encryptedChoice);
    expect(clearChoice).to.eq(0);

    await (await contract.connect(signers.bob).allowCounts(signers.bob.address)).wait();
    const encryptedCount = await contract.getEncryptedCount(0, 0);
    const clearCount = await decryptU32OrZero(contractAddress, signers.bob, encryptedCount);
    expect(clearCount).to.eq(1);
  });
});

