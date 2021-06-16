import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";

// types
import { RolManager } from "../typechain";

// utils
import { parseEvent } from "./utils";

describe("Factory", () => {
  let factory: Contract;
  let registry: Contract;

  let admin: SignerWithAddress;
  let proposer: SignerWithAddress;
  let executer: SignerWithAddress;
  let canceler: SignerWithAddress;

  beforeEach(async () => {
    [admin, proposer, executer, canceler] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();
    await registry.deployed();

    const Factory = await ethers.getContractFactory("RolManagerFactory");
    factory = await Factory.deploy(registry.address);
    await factory.deployed();
  });

  it("Should create RolManager", async () => {
    const res = await factory
      .connect(admin)
      .createFailSafe(
        40,
        "My failSafe",
        admin.address,
        [
          "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1",
          "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63",
          "0xebfdca8e46c0b8dacf9989ee613e35727eadd20a1d5e5ad01a53968c7e5fe07a",
        ],
        [proposer.address, executer.address, canceler.address],
      );
    const txReceipt = await res.wait();

    const event = parseEvent(txReceipt.events, "RolManagerCreated(address,address,address,string)");
    expect(event, "no event emitted").to.be.not.null;

    const newRolManager = (await ethers.getContractAt("RolManager", event.args.rolManagerAddress)) as RolManager;
    const adminRole = await newRolManager.ROLMANAGER_ADMIN_ROLE();
    const proposerRole = await newRolManager.PROPOSER_ROLE();
    const executerRole = await newRolManager.EXECUTOR_ROLE();
    const cancelerRole = await newRolManager.CANCELER_ROLE();

    expect(await newRolManager.hasRole(adminRole, admin.address)).to.be.true;
    expect(await newRolManager.hasRole(proposerRole, proposer.address)).to.be.true;
    expect(await newRolManager.hasRole(executerRole, executer.address)).to.be.true;
    expect(await newRolManager.hasRole(cancelerRole, canceler.address)).to.be.true;
    expect(await newRolManager.hasRole(adminRole, event.args.admin)).to.be.true;
  });

  it("Should create RolManager and assign roles on creation", async () => {
    const res = await factory.connect(admin).createFailSafe(40, "My failSafe", admin.address, [], []);
    const txReceipt = await res.wait();

    const event = parseEvent(txReceipt.events, "RolManagerCreated(address,address,address,string)");
    expect(event, "no event emitted").to.be.not.null;

    const newRolManager = (await ethers.getContractAt("RolManager", event.args.rolManagerAddress)) as RolManager;
    const adminRole = await newRolManager.ROLMANAGER_ADMIN_ROLE();

    expect(await newRolManager.hasRole(adminRole, admin.address)).to.be.true;
    expect(await newRolManager.hasRole(adminRole, event.args.admin)).to.be.true;
  });

  it(`Should set registry address`, async () => {
    const res = await factory.registry();
    expect(res, "Registry not match").to.be.eq(registry.address);
  });
});
