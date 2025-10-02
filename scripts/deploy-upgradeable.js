const { ethers, upgrades } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  const Sydney = await ethers.getContractFactory("Sydney");
  console.log("Deploying Sydney...");
  const sydney = await upgrades.deployProxy(Sydney, [deployer.address], {
    initializer: "initialize",
  });
  await sydney.waitForDeployment();
  console.log("Sydney deployed to:", await sydney.getAddress());
}
main();
