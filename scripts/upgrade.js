const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading the contract with the account:", deployer.address);
  const SydneyV3 = await ethers.getContractFactory("SydneyV3");
  console.log("Upgrading Sydney...");
  const sydneyV3 = await upgrades.upgradeProxy(
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    SydneyV3
  );
  await sydneyV3.waitForDeployment();
  console.log("Sydney upgraded at:", await sydneyV3.getAddress());

  const contractVersion = await sydneyV3.version();
  console.log("Contract version after upgrade:", contractVersion);
}
main().catch(console.error);
