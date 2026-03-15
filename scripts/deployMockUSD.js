import dotenv from "dotenv";
import hre from "hardhat";
import fs from "fs";
const { ethers } = hre;

dotenv.config();

async function main() {
  // Get the signer who will deploy the contract
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account found. Please ensure PRIVATE_KEY is set in your .env file.");
  }
  
  console.log("======================================================");
  console.log("Deploying MockUSD Stablecoin");
  console.log("======================================================");
  console.log("Deployer Address:", deployer.address);

  // Set the initial admin who will receive the initial supply and ownership
  // Defaults to NEXT_PUBLIC_ADMIN_ADDRESS if available, otherwise the deployer
  const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || deployer.address;
  console.log("Admin/Owner Address:", adminAddress);

  // Get the contract factory
  const MockUSD = await ethers.getContractFactory("MockUSD");
  
  console.log("\nSending deployment transaction...");
  const mockUSD = await MockUSD.deploy(adminAddress);

  console.log("Waiting for deployment confirmation...");
  await mockUSD.waitForDeployment();

  const address = await mockUSD.target;
  fs.writeFileSync("MOCKUSD_ADDRESS.txt", address.toString());

  console.log("\n======================================================");
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("======================================================");
  console.log("MockUSD Contract Address:", address);
  console.log("Token Symbol: MUSD");
  console.log("Decimals: 6");
  console.log("Initial Supply: 1,000,000 MUSD minted to Admin");
  console.log("======================================================");
  
  console.log("\nYou can now use this address in your frontend .env file:");
  console.log(`NEXT_PUBLIC_MOCK_USD_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed!");
    console.error(error);
    process.exit(1);
  });
