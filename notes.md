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
- **DO:TUTORIAL**: https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580
- **DO:TUTORIAL**: https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

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
- PPP inherits from `ERC1967Proxy.sol`

```
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UUPSProxy is ERC1967Proxy {
    constructor(address _implementation, bytes memory _data) ERC1967Proxy(_implementation, _data)
    payable {}
}
```

- initializer: normal functions, configured to only execute once, e.g.:
  - `function initialize(address initialOwner) initializer public { __Ownable_init(initialOwner); __UUPSUpgradeable_init(); }`
- vulnerability: 2 owners: set thru PPP, set at LLL
  - so: prevent calling the init'l'z'n f'n directly on the LLL
  - e.g.: `constructor() { _disableInitializers(); }`
- vulnerability: delegating calls to selfdestruct
  - so: don't use `delegatecall()` in LLLs

# OZ forums: OZ upgrades: step-by-step tutorial w/ HH

- link: https://forum.openzeppelin.com/t/openzeppelin-upgrades-step-by-step-tutorial-for-hardhat/3580
- good run-thru!

# OZ forums: UUPS Proxies Tutoria (Solidity + JS)

- link: https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786
- quicker run-thru
- The original proxies included in OZ followed the TUP pattern
- gotta be explicit: `await upgrades.deployProxy(MyTokenV1, { kind: 'uups' });`

# summary setup, from these articles

```
// shell commands
mkdir mycontract && cd mycontract
npm init -y
npm install hardhat @nomiclabs/hardhat-ethers ethers
npm install @openzeppelin/contracts-upgradeable @openzeppelin/hardhat-upgrades
```

_...OR..._

```
// shell commands
mkdir mycontract && cd mycontract
npm init -y
npm install --save-dev hardhat
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install --save-dev @nomiclabs/hardhat-ethers ethers
npm install --save-dev chai

// so far, not: npm install @openzeppelin/contracts-upgradeable
```

```
// hardhat.config.js
const { alchemyApiKey, mnemonic } = require('./secrets.json');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${alchemyApiKey}`,
      accounts: {mnemonic: mnemonic}
    }
  }
};

```

```
// contract/MyTokenV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
contract MyTokenV1 is Initializable, ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    function initialize() initializer public {
      __ERC20_init("MyToken", "MTK");
      __Ownable_init();
      __UUPSUpgradeable_init();
      _mint(msg.sender, 1000 * 10 ** decimals());
    }
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

**BoxV1.sol goes here**

```
// test/MyToken.test.js
const { ethers, upgrades } = require('hardhat');
describe('MyToken', function () {
  it('deploys', async function () {
    const MyTokenV1 = await ethers.getContractFactory('MyTokenV1');
    await upgrades.deployProxy(MyTokenV1, { kind: 'uups' });
  });
});
```

```
// scripts/deploy.js
async function main() {
    const Box = await ethers.getContractFactory("Box");
    console.log("Deploying Box...");
    const box = await upgrades.deployProxy(Box, [42], { initializer: 'store' });
    console.log("Box deployed to:", box.address);
}
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
```

```
// shell commands
npx hardhat run --network rinkeby scripts/deploy.js
Deploying Box...
Box deployed to: 0xFF60fd044dDed0E40B813DC7CE11Bed2CCEa501F
npx hardhat console --network rinkeby
> const Box = await ethers.getContractFactory("Box")
undefined
> const box = await Box.attach("0xFF60fd044dDed0E40B813DC7CE11Bed2CCEa501F")
undefined
> (await box.retrieve()).toString()
'42'
```

**transfering AAA to new owner: Gnosis Safe 1-of-1 multisig...**

```
// scripts/transfer_ownership.js
async function main() {
  const gnosisSafe = '0x1c14600daeca8852BA559CC8EdB1C383B8825906';
  console.log("Transferring ownership of ProxyAdmin...");
  // The owner of the ProxyAdmin can upgrade our contracts
  await upgrades.admin.transferProxyAdminOwnership(gnosisSafe);
  console.log("Transferred ownership of ProxyAdmin to:", gnosisSafe);
}
```

```
// shell commands
$ npx hardhat run --network rinkeby scripts/transfer_ownership.js
Transferring ownership of ProxyAdmin...
Transferred ownership of ProxyAdmin to: 0x1c14600daeca8852BA559CC8EdB1C383B8825906
```

```
// contract/MyTokenV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
contract MyTokenV2 is Initializable, ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    function initialize() initializer public {
      __ERC20_init("MyToken", "MTK");
      __Ownable_init();
      __UUPSUpgradeable_init();
      _mint(msg.sender, 1000 * 10 ** decimals());
    }
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
    function _authorizeUpgrade(address) internal override onlyOwner {}
    function version2() public returns (string memory) {
      return "version 2";
    }
}
```

**BoxV2.sol goes here**

```
// scripts/upgrade.js
await upgrades.upgradeProxy(proxyAddress, MyTokenV2);
```

...OR...

```
// scripts/prepare_upgrade.js
async function main() {
  const proxyAddress = '0xFF60fd044dDed0E40B813DC7CE11Bed2CCEa501F';

  const BoxV2 = await ethers.getContractFactory("BoxV2");
  console.log("Preparing upgrade...");
  const boxV2Address = await upgrades.prepareUpgrade(proxyAddress, BoxV2);
  console.log("BoxV2 at:", boxV2Address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

```
// shell commands
$ npx hardhat run --network rinkeby scripts/prepare_upgrade.js
Preparing upgrade...
BoxV2 at: 0xE8f000B7ef04B7BfEa0a84e696f1b792aC526700
```

**DO:UPGRADE** via Gnosis Safe
