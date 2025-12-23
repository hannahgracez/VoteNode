const fs = require("node:fs");
const path = require("node:path");

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const deploymentPath = path.join(repoRoot, "deployments", "sepolia", "EncryptedPersonalitySurvey.json");
  const artifactPath = path.join(
    repoRoot,
    "artifacts",
    "contracts",
    "EncryptedPersonalitySurvey.sol",
    "EncryptedPersonalitySurvey.json",
  );
  const outputPath = path.join(repoRoot, "frontend", "src", "config", "contracts.ts");

  let address;
  let abi;

  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    if (!deployment?.address || !deployment?.abi) {
      throw new Error(`Invalid deployment JSON: ${deploymentPath}`);
    }
    address = deployment.address;
    abi = deployment.abi;
  } else {
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Missing artifact file: ${artifactPath}\nRun: npm run compile`);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    if (!artifact?.abi) {
      throw new Error(`Invalid artifact JSON: ${artifactPath}`);
    }
    address = "0x0000000000000000000000000000000000000000";
    abi = artifact.abi;
    console.warn(`Sepolia deployment not found; wrote ABI from artifacts and kept address as ${address}`);
  }

  const ts = `export const CONTRACT_ADDRESS = '${address}' as const;\n\nexport const CONTRACT_ABI = ${JSON.stringify(
    abi,
    null,
    2,
  )} as const;\n`;

  fs.writeFileSync(outputPath, ts, "utf8");
  console.log(`Wrote ${outputPath}`);
}

main();
