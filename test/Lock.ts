import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { parseGwei } from "viem";
import { ethers } from "hardhat";

async function deployOneYearLockFixture() {
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

  const lockedAmount = parseGwei("1");
  const unlockTime = BigInt((await time.latest()) + ONE_YEAR_IN_SECS);

  const [owner, otherAccount] = await ethers.getSigners();

  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  return { lock, unlockTime, lockedAmount, owner, otherAccount };
}

describe("Lock", function () {
  let lock, unlockTime, lockedAmount, owner, otherAccount;
  beforeEach(async function () {
    ({ lock, unlockTime, lockedAmount, owner, otherAccount } =
      await loadFixture(deployOneYearLockFixture));
  });

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      expect(await ethers.provider.getBalance(lock.target)).to.equal(
        lockedAmount,
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = BigInt(await time.latest());
      const Lock = await ethers.getContractFactory("Lock");
      await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future",
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet",
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // 可以用lock.connect() 来使用账户执行withdraw方法
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner",
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);
        await expect(lock.withdraw()).to.be.satisfy;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg, true
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        await time.increaseTo(unlockTime);
        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount],
        );
      });
    });
  });
});
