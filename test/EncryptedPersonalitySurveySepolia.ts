import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { deployments, ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedPersonalitySurvey } from "../types";

describe("EncryptedPersonalitySurveySepolia", function () {
  let signer: HardhatEthersSigner;
  let contract: EncryptedPersonalitySurvey;
  let contractAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedPersonalitySurvey");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("EncryptedPersonalitySurvey", deployment.address);
    } catch (e) {
      (e as Error).message += ". Run: npx hardhat deploy --network sepolia";
      throw e;
    }

    const signers = await ethers.getSigners();
    signer = signers[0];
  });

  it("can user-decrypt my answers (or submit once and then decrypt)", async function () {
    this.timeout(4 * 60000);

    const alreadySubmitted = await contract.hasSubmitted(signer.address);
    if (!alreadySubmitted) {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signer.address)
        .add8(1)
        .add8(2)
        .add8(3)
        .add8(0)
        .add8(2)
        .encrypt();

      await (
        await contract
          .connect(signer)
          .submitAnswers(
            encryptedInput.handles[0],
            encryptedInput.handles[1],
            encryptedInput.handles[2],
            encryptedInput.handles[3],
            encryptedInput.handles[4],
            encryptedInput.inputProof,
          )
      ).wait();
    }

    for (let q = 0; q < 5; q++) {
      const optionCount = Number(await contract.optionCountForQuestion(q));
      const encrypted = await contract.getEncryptedChoice(signer.address, q);
      expect(encrypted).to.not.eq(ethers.ZeroHash);

      const clear = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted, contractAddress, signer);
      const clearNumber = Number(clear);
      expect(clearNumber).to.be.gte(0);
      expect(clearNumber).to.be.lt(optionCount);
    }
  });

  it("can grant myself ACL and decrypt tally counts", async function () {
    this.timeout(4 * 60000);

    await (await contract.connect(signer).allowCounts(signer.address)).wait();

    // Only sanity-check that at least one tally handle is decryptable when non-zero.
    let decryptedAny = false;
    for (let q = 0; q < 5; q++) {
      for (let o = 0; o < 4; o++) {
        const encrypted = await contract.getEncryptedCount(q, o);
        if (encrypted === ethers.ZeroHash) continue;
        const clear = await fhevm.userDecryptEuint(FhevmType.euint32, encrypted, contractAddress, signer);
        expect(Number(clear)).to.be.gte(0);
        decryptedAny = true;
        break;
      }
      if (decryptedAny) break;
    }

    if (!decryptedAny) {
      console.warn("No non-zero tally handles found to decrypt (no submissions yet).");
    }
  });
});

