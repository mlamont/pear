# OZ upgrading SCs

- link: https://docs.openzeppelin.com/learn/upgrading-smart-contracts
- 3 types of contract: {admin, proxy, logic} {AAA, PPP, LLL}
- **DO:INSTALL** the upgrades plugin:
  - `npm install --save-dev @openzeppelin/hardhat-upgrades`
- **DO:UPDATE** hardhat.config.js:
  - `require("@nomicfoundation/hardhat-ethers"); require('@openzeppelin/hardhat-upgrades');`

## deployProxy

- deploying a contract with this makes it upgradeable later
- default: only the deploying address can upgrade this contract
- deploys a LLL
- deploys the PPP and runs any initializer f'n
  - auto-deploys an AAA (`ProxyAdmin`)
- **DO:WRITE** script (deployProxy):
  ```
  // scripts/deploy_upgradeable_box.js
  const { ethers, upgrades } = require('hardhat');
  async function main () {
      const Box = await ethers.getContractFactory('Box');
      console.log('Deploying Box...');
      const box = await upgrades.deployProxy(Box, [42], { initializer: 'store' });
      await box.waitForDeployment();
      console.log('Box deployed to:', await box.getAddress());
  }
  main();
  // Box deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  // (PPP address)
  ```
- **DO:RUN** script (deployProxy):
  - `npx hardhat run --network localhost scripts/deploy_upgradeable_box.js`

## upgradeProxy

- deploys a new LLL
- calls AAA to update PPP to use the new LLL
- **DO:WRITE** script (upgradeProxy):
  ```
  // scripts/upgrade_box.js
  const { ethers, upgrades } = require('hardhat');
  async function main () {
    const BoxV2 = await ethers.getContractFactory('BoxV2');
    console.log('Upgrading Box...');
    await upgrades.upgradeProxy('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', BoxV2);
    console.log('Box upgraded');
  }
  main();
  // PPP address remains
  ```
- **DO:RUN** script (upgradeProxy):
  - `npx hardhat run --network localhost scripts/upgrade_box.js`
- **QUESTIONS**
  - So do we know the addresses of the old LLL, new LLL, and AAA???

## how upgrades work

- When you create a new upgradeable contract instance, the 'Plugins' actually deploys 3 contracts:
  - LLL (the one we wrote)
  - PPP (the one we actually interact with)
  - AAA (a 'ProxyAdmin')
- PPP (state / n) delegates all calls to LLL (code / v)
- If you want to change the code, then have the PPP delegate calls to a different LLL.

## limitations: initialization

- upgradeable contracts cannot have a constructor
  - OZ provides a `Initializable` base contract to tag a method as `initializer` (to only run it once)
  - the initializer acts as a constructor
    - but b/c it's a regular function, y'have to call the initializers of any base contracts
  - but have a constructor anyway, to leave the contract in an initialized state, mitigating certain attacks
    - `constructor() initializer {}`
- when deploying:
  - default initializing function is `initialize`, else specify the `initializer` function, and
  - provide AAA address

```
// scripts/deploy_upgradeable_adminbox.js
const { ethers, upgrades } = require('hardhat');
async function main () {
  const AdminBox = await ethers.getContractFactory('AdminBox');
  console.log('Deploying AdminBox...');
  const adminBox = await upgrades.deployProxy(AdminBox, ['0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E'], { initializer: 'initialize' });
  await adminBox.waitForDeployment();
  console.log('AdminBox deployed to:', await adminBox.getAddress());
}
main();
// that address being passed in is the value for the initializer:
// ...the one who can play admin for the box,
// ...nothing to do w/ AAA
```

## limitations: upgrading

- cannot change storage variables' layout (or their types)
  - can only add storage variables, and only after the already declared ones
  - (and y'CAN rename 'em, but they'll keep the same values pre-upgrade)
- but can totally change functions & events

# OZ HH Upgrades API

- link: https://docs.openzeppelin.com/upgrades-plugins/api-hardhat-upgrades

## deployProxy

- returns a contract instance with the PPP address and the LLL interface
- if provide args, then will deploy & initialize with `initialize` function
- if provide args and specific initializer function, then will deploy & initialize with specific initializer function

## upgradeProxy

- returns a contract instance with the PPP address and the new LLL interface
- takes a contract factory of the new LLL
- takes options, including a call+args to an arbitrary function during upgrade (good for migration initializing functions)

## verify

- The arguments are the same as for hardhat-verify’s verify task. If the provided address is a proxy, this task will verify the proxy’s implementation contract, the proxy itself and any proxy-related contracts, as well as link the proxy to the implementation contract’s ABI on Etherscan. If the provided address is not a proxy, the regular verify task from hardhat-verify will be run on the address instead.
- **DO:INSTALL** HH-verify
  - `npm install --save-dev @nomicfoundation/hardhat-verify`
- **DO:UPDATE** hardhat.config.js
  - `require("@nomicfoundation/hardhat-verify"); require("@openzeppelin/hardhat-upgrades");`
- **DO:RUN** verify
  - `npx hardhat verify --network mainnet PROXY_ADDRESS`

# OZ Upgrades Plugins

- link: https://docs.openzeppelin.com/upgrades-plugins
- validates that LLLs are upgrade-safe
- keeps track of all the LLL contracts (not PPPs) you have deployed in an .openzeppelin folder in the project root, as well as the AAA
- looks like the 2 functions to use are `deployProxy` & `upgradeProxy`
- UUPS proxies rely on an \_authorizeUpgrade function to be overridden to include access restriction to the upgrade mechanism
  - b/c UUPS proxies don't use admin addresses

# Using w/ HH

- link: https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades

## using in tests

```
const  expect  = require("chai");
describe("Box", function()
  it('works', async () => {
    const Box = await ethers.getContractFactory("Box");
    const BoxV2 = await ethers.getContractFactory("BoxV2");

    const instance = await upgrades.deployProxy(Box, [42]);
    const upgraded = await upgrades.upgradeProxy(await instance.getAddress(), BoxV2);

    const value = await upgraded.value();
    expect(value.toString()).to.equal('42');
  });
);
```

# Writing Upgradeable Contracts

- link: https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable
- cannot use a `constructor`, so
  - use `initialize`,
  - ensure it's called only once (OZ provides a base contract for this),
    - `initializer` modifier can only be called once even when using inheritance
  - manually call the initializers of all parent contracts
    - parent contracts should use the `onlyInitializing` modifier
- Whether using OpenZeppelin Contracts or another smart contract library, always make sure that the package is set up to handle upgradeable contracts.
  - not: @openzeppelin/contracts/token/ERC20/ERC20.sol
  - but: @openzeppelin/contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol
- state variables (in upgradeable contracts):
  - unless a `constant`, declare at top, but initialize in `initialize`
- an uninitialized LLL is vulnerable
  - To prevent the implementation contract from being used, you should invoke the `_disableInitializers` function in the constructor to automatically lock it when it is deployed
- unsafe operations: `selfdestruct` & `delegatecall`

# Proxy Upgrade Pattern

- link: https://docs.openzeppelin.com/upgrades-plugins/proxies
- PPP = "access point"
- a form of `delegatecall` is in the PPP's `fallback()`
- PPP uses 'unstructured storage': semi-random slots used for PPP, avoiding collisions with LLL's storage slots
- It's on the user to have new LLLs extend previous LLLs, basically: new LLLs append state variables to old LLLs
