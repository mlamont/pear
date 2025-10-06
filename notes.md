# OZ upgrading SCs

- link: https://docs.openzeppelin.com/learn/upgrading-smart-contracts
- 3 types of contract: {admin, proxy, logic} {AAA, PPP, LLL}
- **DO:INSTALL** the upgrades plugin:
  - `npm install --save-dev @openzeppelin/hardhat-upgrades`
  - `npm install --save-dev @openzeppelin/contracts-upgradeable`
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
  - default initializing function is `initialize`, else specify the `initializer` function

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
- UUPS proxies rely on an `_authorizeUpgrade` function to be overridden to include access restriction to the upgrade mechanism
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
- unsafe operations (in the LLL): `selfdestruct` & `delegatecall`

# Proxy Upgrade Pattern

- link: https://docs.openzeppelin.com/upgrades-plugins/proxies
- PPP = "access point"
- a form of `delegatecall` is in the PPP's `fallback()`
- PPP uses 'unstructured storage': semi-random slots used for PPP, avoiding collisions with LLL's storage slots
- It's on the user to have new LLLs extend previous LLLs, basically: new LLLs append state variables to old LLLs

# Open Questions

- Does V2 need `initialize()`?
  - **DO:TEST**: making V2s w/o this f'n and see if anything breaks
- How to end upgradeability?
  - **DO:INV**
- Where do I find all 3 contracts, both in local & testnet blockchains?
  - ~~...to possibly see 3 contracts on Sepolia, I'll need HH-verify working...~~
  - **DO:TEST**: deploy to Sepolia, w/ HHConfigJS updated
- ~~ So do we know the addresses of the old LLL, new LLL, and AAA???~~
- ~~How do I resolve these dependency tree issues? (HH-verify) (HH-ethers)~~
  - ~~possibly do `npm uninstall ...` then `npm install ...`~~
  - _installed earlier versions of these packages_
- ~~Where are we keeping/archiving the addresses of the old LLLs?~~

# Other Notes

- so it looks like only the first LLL's `initialize` is run (per deployProxy), and not the subsequent LLLs' (per upgradeProxy)
- had to install previous versions of packages, matching those for the Orange project:
  - `npm install --save-dev @nomicfoundation/hardhat-ethers@3.1.0 ethers`
  - `npm install --save-dev @nomicfoundation/hardhat-verify@2.1.1`

# UUPS (ERC-1822)

- link: https://rareskills.io/post/uups-proxy
- (Transparent Upgradeable Proxy pattern: "TUP")
- unlike TUP: solves 'function selector clashes' by not having public functions in PPP
- unlike TUP: no need for an AdminProxy
- unlike TUP: comparing `msg.sender` to admin on just the `_upgradeLogic()` call (not every call)
- can mod upgrade mechanism, as upgrade LLL: add complexity, add voting, add timing
  - also: can nix upgrade mechanism, with an LLL upgrade
- compatibility check: have signature of `proxiableUUID()`
- LLL inherits from `UUPSUpgradeable.sol`, which provides `proxiableUUID()`
  - compatibility check (has to have this name, per the standard)
  - returns storage slot for LLL address
  - calling this in new LLL is first step, gating rest of migration/upgrade

```
function proxiableUUID() external view virtual notDelegated returns (bytes32) {
  return ERC1967Utils.IMPLEMENTATION_SLOT; // conformal to the ERC-1967 standard
}
```

- LLL inherits from `UUPSUpgradeable.sol`, which provides `updateToAndCall()`
  - (can be called anything, acutally)
  - a public function, but with `onlyProxy` modifier

```
function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
    // checks whether the upgrade can proceed
    _authorizeUpgrade(newImplementation);
    // upgrade to the new implementation
    _upgradeToAndCallUUPS(newImplementation, data);
}

function _authorizeUpgrade(address newImplementation) internal virtual;

function _upgradeToAndCallUUPS(address newImplementation, bytes memory data) private {
    // checks whether the new implementation implements ERC-1822
    try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
        if (slot != ERC1967Utils.IMPLEMENTATION_SLOT) {
            revert UUPSUnsupportedProxiableUUID(slot);
        }
        ERC1967Utils.upgradeToAndCall(newImplementation, data);
    } catch {
        // The implementation is not UUPS
        revert ERC1967Utils.ERC1967InvalidImplementation(newImplementation);
    }
}
```

- LLL inherits from `UUPSUpgradeable.sol`, which provides `_authorizeUpgrade()`
  - dev's responsibility to implement this (else won't compile), checking for owner is simplest:
    - `function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}`
  - can switch to a multi-sig scheme!
