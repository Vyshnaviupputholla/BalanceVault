
const express = require("express");
const prisma = require("../db/prisma");
const authenticateToken = require("../middleware/auth");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const crypto = require("crypto");

const router = express.Router();

// All routes require an authenticated ADMIN
router.use(authenticateToken);
router.use(authorizeAdmin);

// ==========================================
// 1. GET ALL PENDING CUSTOMERS
// ==========================================
router.get("/pending-users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "PENDING",
        role: "CUSTOMER"
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return res.status(200).json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Pending users error:", error);

    return res.status(500).json({
      message: "Unable to retrieve pending users"
    });
  }
});

// ==========================================
// 2. APPROVE PENDING CUSTOMER
// ==========================================
router.patch("/approve-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          role: "CUSTOMER",
          status: "PENDING"
        },
        data: {
          status: "ACTIVE"
        }
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "USER_APPROVED",
          entityType: "USER",
          entityId: userId
        }
      });

      return true;
    });

    if (!result) {
      return res.status(404).json({
        message: "Pending customer not found or already approved"
      });
    }

    return res.status(200).json({
      message: "Customer approved successfully",
      userId
    });
  } catch (error) {
    console.error("Customer approval error:", error);

    return res.status(500).json({
      message: "Unable to approve customer"
    });
  }
});

// ==========================================
// 3. GET ALL PENDING ACCOUNT REQUESTS
// ==========================================
router.get("/pending-account-requests", async (req, res) => {
  try {
    const requests = await prisma.accountRequest.findMany({
      where: {
        status: "PENDING"
      },
      select: {
        id: true,
        accountType: true,
        status: true,
        createdAt: true,
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return res.status(200).json({
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error("Pending account requests error:", error);

    return res.status(500).json({
      message: "Unable to retrieve pending account requests"
    });
  }
});

// ==========================================
// 4. APPROVE PENDING ACCOUNT REQUEST
// ==========================================
router.patch("/approve-account/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

    const account = await prisma.$transaction(async (tx) => {
      // Find the pending request
      const accountRequest = await tx.accountRequest.findUnique({
        where: {
          id: requestId
        }
      });

      if (!accountRequest || accountRequest.status !== "PENDING") {
        return null;
      }

      // Change request status only if it is still pending
      const updated = await tx.accountRequest.updateMany({
        where: {
          id: requestId,
          status: "PENDING"
        },
        data: {
          status: "APPROVED",
          reviewedById: req.user.id
        }
      });

      if (updated.count !== 1) {
        return null;
      }

      // Create a unique account number
      const accountNumber =
        "BV" + crypto.randomBytes(8).toString("hex").toUpperCase();

      // Create the bank account
      const newAccount = await tx.account.create({
        data: {
          ownerId: accountRequest.requestedById,
          accountNumber,
          accountType: accountRequest.accountType,
          status: "ACTIVE",
          currency: "INR",
          balance: 0
        }
      });

      // Record the approval in audit log
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "ACCOUNT_APPROVED",
          entityType: "ACCOUNT",
          entityId: newAccount.id
        }
      });

      return newAccount;
    });

    if (!account) {
      return res.status(404).json({
        message: "Pending account request not found or already approved"
      });
    }

    return res.status(200).json({
      message: "Account approved successfully",
      account
    });
  } catch (error) {
    console.error("Account approval error:", error);

    return res.status(500).json({
      message: "Unable to approve account request"
    });
  }
});

module.exports = router;
