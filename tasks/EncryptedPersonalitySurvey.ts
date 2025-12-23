import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("survey:address", "Prints the EncryptedPersonalitySurvey address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;
  const deployment = await deployments.get("EncryptedPersonalitySurvey");
  console.log("EncryptedPersonalitySurvey address is " + deployment.address);
});

task("survey:submit", "Submits encrypted answers to the EncryptedPersonalitySurvey contract")
  .addOptionalParam("address", "Optionally specify the EncryptedPersonalitySurvey contract address")
  .addParam("q0", "Answer for question 0 (integer)")
  .addParam("q1", "Answer for question 1 (integer)")
  .addParam("q2", "Answer for question 2 (integer)")
  .addParam("q3", "Answer for question 3 (integer)")
  .addParam("q4", "Answer for question 4 (integer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedPersonalitySurvey");
    console.log(`EncryptedPersonalitySurvey: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const user = signers[0];

    const values = [taskArguments.q0, taskArguments.q1, taskArguments.q2, taskArguments.q3, taskArguments.q4].map(
      (v) => {
        const parsed = parseInt(v);
        if (!Number.isInteger(parsed)) throw new Error(`All answers must be integers`);
        if (parsed < 0 || parsed > 255) throw new Error(`Answer out of uint8 range`);
        return parsed;
      },
    );

    const contract = await ethers.getContractAt("EncryptedPersonalitySurvey", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, user.address)
      .add8(values[0])
      .add8(values[1])
      .add8(values[2])
      .add8(values[3])
      .add8(values[4])
      .encrypt();

    const tx = await contract
      .connect(user)
      .submitAnswers(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.handles[3],
        encryptedInput.handles[4],
        encryptedInput.inputProof,
      );
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("survey:decrypt-choices", "Decrypts a user's encrypted answers (requires ACL)")
  .addOptionalParam("address", "Optionally specify the EncryptedPersonalitySurvey contract address")
  .addOptionalParam("user", "User address (defaults to first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedPersonalitySurvey");
    console.log(`EncryptedPersonalitySurvey: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const viewer = signers[0];
    const userAddress = (taskArguments.user as string | undefined) ?? viewer.address;

    const contract = await ethers.getContractAt("EncryptedPersonalitySurvey", deployment.address);

    for (let q = 0; q < 5; q++) {
      const encrypted = await contract.getEncryptedChoice(userAddress, q);
      if (encrypted === ethers.ZeroHash) {
        console.log(`q${q}: (uninitialized)`);
        continue;
      }

      const clear = await fhevm.userDecryptEuint(FhevmType.euint8, encrypted, deployment.address, viewer);
      console.log(`q${q}: ${clear}`);
    }
  });

task("survey:decrypt-counts", "Decrypts tally counts for a question (calls allowCounts first)")
  .addOptionalParam("address", "Optionally specify the EncryptedPersonalitySurvey contract address")
  .addParam("question", "Question index (0-4)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedPersonalitySurvey");
    console.log(`EncryptedPersonalitySurvey: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const viewer = signers[0];

    const q = parseInt(taskArguments.question);
    if (!Number.isInteger(q) || q < 0 || q > 4) throw new Error("Invalid question index");

    const contract = await ethers.getContractAt("EncryptedPersonalitySurvey", deployment.address);

    const allowTx = await contract.connect(viewer).allowCounts(viewer.address);
    await allowTx.wait();

    for (let o = 0; o < 4; o++) {
      const encrypted = await contract.getEncryptedCount(q, o);
      if (encrypted === ethers.ZeroHash) {
        console.log(`q${q} option ${o}: 0`);
        continue;
      }

      const clear = await fhevm.userDecryptEuint(FhevmType.euint32, encrypted, deployment.address, viewer);
      console.log(`q${q} option ${o}: ${clear}`);
    }
  });

