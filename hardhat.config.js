/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-verify");

module.exports = {
  solidity: "0.8.28",
};
