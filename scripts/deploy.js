import dotenv from "dotenv";
import hre from "hardhat"; // hardhat runtime
const { ethers } = hre;
dotenv.config();
async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer account found. Please ensure PRIVATE_KEY is set in your .env file.");
  }
  const [deployer] = signers;
  console.log("Deploying with account:", deployer.address);
  const KYCLib = await ethers.deployContract("KYCLib");
  await KYCLib.waitForDeployment();
  console.log("KYCLib deployed to:", KYCLib.target);
  const LimitLib = await ethers.deployContract("LimitLib");
  await LimitLib.waitForDeployment();
  console.log("LimitLib deployed to:", LimitLib.target);
  const RemittanceFactory = await ethers.getContractFactory("Remittance", {
    libraries: {
      KYCLib: KYCLib.target,
      LimitLib: LimitLib.target,
    },
  });
  const contract = await RemittanceFactory.deploy();
  await contract.waitForDeployment();
  console.log("Remittance deployed to:", contract.target);
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
