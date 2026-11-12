
const express = require("express");
const prisma = require("../db/prisma");
const authenticateToken = require("../middleware/auth");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const crypto = require("crypto");

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(authorizeAdmin);

// 1. View all pending customers
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
    console.error("Pending users error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve pending users"
    });
  }
});


// 2. Approve a pending customer
router.patch("/approve-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Check whether the user exists and is still pending
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

      // Record the administrator's action
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
        message: "Pending customer not found"
      });
    }

    return res.status(200).json({
      message: "Customer approved successfully",
      userId
    });

  } catch (error) {
    console.error("User approval error:", error.message);

    return res.status(500).json({
      message: "Unable to approve customer"
    });
  }
});


// 3. Approve a customer account request
router.patch("/approve-account/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // Find the pending account request
      const accountRequest = await tx.accountRequest.findUnique({
        where: { id: requestId }
      });

      if (!accountRequest || accountRequest.status !== "PENDING") {
        return null;
      }

      // Mark the request as approved
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

      // Generate a unique account number
      const accountNumber =
        "BV" + crypto.randomBytes(8).toString("hex").toUpperCase();

      // Create the bank account
      const account = await tx.account.create({
        data: {
          ownerId: accountRequest.requestedById,
          accountNumber,
          accountType: accountRequest.accountType,
          status: "ACTIVE",
          currency: "INR",
          balance: 0
        }
      });

      // Save the approval in the audit log
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "ACCOUNT_APPROVED",
          entityType: "ACCOUNT",
          entityId: account.id
        }
      });

      return account;
    });

    if (!result) {
      return res.status(404).json({
        message: "Pending account request not found"
      });
    }

    return res.status(200).json({
      message: "Account approved successfully",
      account: result
    });

  } catch (error) {
    console.error("Account approval error:", error.message);

    return res.status(500).json({
      message: "Unable to approve account request"
    });
  }
});

// 4. View all pending account requests
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
    console.error("Pending account requests error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve pending account requests"
    });
  }
});

module.exports = router;
