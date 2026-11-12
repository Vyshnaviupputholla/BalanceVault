
const express = require("express");
const prisma = require("../db/prisma");
const { Prisma } = require("@prisma/client");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Customer requests a new bank account
router.post("/request", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can request an account"
      });
    }

    const { accountType } = req.body;

    if (!["SAVINGS", "CURRENT"].includes(accountType)) {
      return res.status(400).json({
        message: "Account type must be SAVINGS or CURRENT"
      });
    }

    const existingRequest = await prisma.accountRequest.findFirst({
      where: {
        requestedById: req.user.id,
        status: "PENDING"
      }
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "You already have a pending account request"
      });
    }

    const accountRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.accountRequest.create({
        data: {
          requestedById: req.user.id,
          accountType,
          status: "PENDING"
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "ACCOUNT_REQUESTED",
          entityType: "ACCOUNT_REQUEST",
          entityId: request.id
        }
      });

      return request;
    });

    return res.status(201).json({
      message: "Account request submitted successfully",
      accountRequest
    });

  } catch (error) {
    console.error("Account request error:", error.message);

    return res.status(500).json({
      message: "Unable to submit account request"
    });
  }
});

// Customer views only their own accounts
router.get("/my", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can view customer accounts"
      });
    }

    const accounts = await prisma.account.findMany({
      where: {
        ownerId: req.user.id
      },
      select: {
        id: true,
        accountNumber: true,
        accountType: true,
        status: true,
        currency: true,
        balance: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json({
      count: accounts.length,
      accounts
    });

  } catch (error) {
    console.error("Customer accounts error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve accounts"
    });
  }
});

// Customer deposits demo money into their own active account
router.post("/deposit", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can deposit money"
      });
    }

    const { accountId, amount } = req.body;
    const idempotencyKey = req.get("Idempotency-Key");

    if (
      typeof accountId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)
    ) {
      return res.status(400).json({
        message: "A valid account ID is required"
      });
    }

    if (
      typeof amount !== "string" ||
      !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(amount) ||
      new Prisma.Decimal(amount).lte(0)
    ) {
      return res.status(400).json({
        message: "Enter a valid positive amount with up to 2 decimal places"
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      return res.status(400).json({
        message: "A valid Idempotency-Key header is required"
      });
    }

    const depositAmount = new Prisma.Decimal(amount);

    const existingTransaction = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey }
    });

    if (existingTransaction) {
      return res.status(409).json({
        message: "This deposit request has already been processed"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check that the account belongs to this customer and is active
      const account = await tx.account.findFirst({
        where: {
          id: accountId,
          ownerId: req.user.id,
          status: "ACTIVE"
        }
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_AVAILABLE");
      }

      // Update balance and verify account is still active
      const balanceUpdate = await tx.account.updateMany({
        where: {
          id: accountId,
          ownerId: req.user.id,
          status: "ACTIVE"
        },
        data: {
          balance: {
            increment: depositAmount
          }
        }
      });

      if (balanceUpdate.count !== 1) {
        throw new Error("ACCOUNT_NOT_AVAILABLE");
      }

      // Record the financial transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          idempotencyKey,
          type: "DEPOSIT",
          status: "COMPLETED",
          createdById: req.user.id,
          description: "Customer demo deposit"
        }
      });

      // Record the credit in the ledger
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId,
          amount: depositAmount,
          direction: "CREDIT"
        }
      });

      // Record the audit log
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "MONEY_DEPOSITED",
          entityType: "ACCOUNT",
          entityId: accountId,
          metadata: {
            transactionId: transaction.id,
            amount: amount,
            currency: account.currency
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent")
        }
      });

      return {
        transactionId: transaction.id,
        newBalance: account.balance.plus(depositAmount).toFixed(2)
      };
    });

    return res.status(201).json({
      message: "Deposit completed successfully",
      ...result
    });

  } catch (error) {
    if (error.message === "ACCOUNT_NOT_AVAILABLE") {
      return res.status(404).json({
        message: "Active account not found or does not belong to you"
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This deposit request has already been processed"
      });
    }

    console.error("Deposit error:", error.message);

    return res.status(500).json({
      message: "Unable to process deposit"
    });
  }
});

// Customer withdraws money from their own active account
router.post("/withdraw", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can withdraw money"
      });
    }

    const { accountId, amount } = req.body;
    const idempotencyKey = req.get("Idempotency-Key");

    if (
      typeof accountId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)
    ) {
      return res.status(400).json({
        message: "A valid account ID is required"
      });
    }

    if (
      typeof amount !== "string" ||
      !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(amount) ||
      new Prisma.Decimal(amount).lte(0)
    ) {
      return res.status(400).json({
        message: "Enter a valid positive amount with up to 2 decimal places"
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      return res.status(400).json({
        message: "A valid Idempotency-Key header is required"
      });
    }

    const withdrawalAmount = new Prisma.Decimal(amount);

    const existingTransaction = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey }
    });

    if (existingTransaction) {
      return res.status(409).json({
        message: "This withdrawal request has already been processed"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check account ownership and active status
      const account = await tx.account.findFirst({
        where: {
          id: accountId,
          ownerId: req.user.id,
          status: "ACTIVE"
        }
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_AVAILABLE");
      }

      // Withdraw only if sufficient balance is available
      const balanceUpdate = await tx.account.updateMany({
        where: {
          id: accountId,
          ownerId: req.user.id,
          status: "ACTIVE",
          balance: {
            gte: withdrawalAmount
          }
        },
        data: {
          balance: {
            decrement: withdrawalAmount
          }
        }
      });

      if (balanceUpdate.count !== 1) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // Create withdrawal transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          idempotencyKey,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          createdById: req.user.id,
          description: "Customer demo withdrawal"
        }
      });

      // Record debit in the ledger
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId,
          amount: withdrawalAmount,
          direction: "DEBIT"
        }
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "MONEY_WITHDRAWN",
          entityType: "ACCOUNT",
          entityId: accountId,
          metadata: {
            transactionId: transaction.id,
            amount: amount,
            currency: account.currency
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent")
        }
      });

      const updatedAccount = await tx.account.findUnique({
        where: { id: accountId },
        select: { balance: true }
      });

      return {
        transactionId: transaction.id,
        newBalance: updatedAccount.balance.toFixed(2)
      };
    });

    return res.status(201).json({
      message: "Withdrawal completed successfully",
      ...result
    });

  } catch (error) {
    if (error.message === "ACCOUNT_NOT_AVAILABLE") {
      return res.status(404).json({
        message: "Active account not found or does not belong to you"
      });
    }

    if (error.message === "INSUFFICIENT_FUNDS") {
      return res.status(409).json({
        message: "Insufficient balance or account is no longer active"
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This withdrawal request has already been processed"
      });
    }

    console.error("Withdrawal error:", error.message);

    return res.status(500).json({
      message: "Unable to process withdrawal"
    });
  }
});

// Customer transfers money to another active account
router.post("/transfer", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Only customers can transfer money"
      });
    }

    const { fromAccountId, toAccountId, amount } = req.body;
    const idempotencyKey = req.get("Idempotency-Key");

    const validUUID = (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    if (!validUUID(fromAccountId) || !validUUID(toAccountId)) {
      return res.status(400).json({
        message: "Valid source and destination account IDs are required"
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        message: "Source and destination accounts must be different"
      });
    }

    if (
      typeof amount !== "string" ||
      !/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(amount) ||
      new Prisma.Decimal(amount).lte(0)
    ) {
      return res.status(400).json({
        message: "Enter a valid positive amount with up to 2 decimal places"
      });
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      return res.status(400).json({
        message: "A valid Idempotency-Key header is required"
      });
    }

    const transferAmount = new Prisma.Decimal(amount);

    const existingTransaction = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey }
    });

    if (existingTransaction) {
      return res.status(409).json({
        message: "This transfer request has already been processed"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify that the sender owns an active source account
      const sourceAccount = await tx.account.findFirst({
        where: {
          id: fromAccountId,
          ownerId: req.user.id,
          status: "ACTIVE"
        }
      });

      if (!sourceAccount) {
        throw new Error("SOURCE_ACCOUNT_NOT_AVAILABLE");
      }

      // Verify that the destination account is active
      const destinationAccount = await tx.account.findFirst({
        where: {
          id: toAccountId,
          status: "ACTIVE"
        }
      });

      if (!destinationAccount) {
        throw new Error("DESTINATION_ACCOUNT_NOT_AVAILABLE");
      }

      // Both accounts must use the same currency
      if (sourceAccount.currency !== destinationAccount.currency) {
        throw new Error("CURRENCY_MISMATCH");
      }

      // Deduct money only when sufficient balance exists
      const debit = await tx.account.updateMany({
        where: {
          id: fromAccountId,
          ownerId: req.user.id,
          status: "ACTIVE",
          balance: {
            gte: transferAmount
          }
        },
        data: {
          balance: {
            decrement: transferAmount
          }
        }
      });

      if (debit.count !== 1) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // Credit the receiver's account
      const credit = await tx.account.updateMany({
        where: {
          id: toAccountId,
          status: "ACTIVE",
          currency: sourceAccount.currency
        },
        data: {
          balance: {
            increment: transferAmount
          }
        }
      });

      if (credit.count !== 1) {
        throw new Error("DESTINATION_ACCOUNT_NOT_AVAILABLE");
      }

      // Create one transfer transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          idempotencyKey,
          type: "TRANSFER",
          status: "COMPLETED",
          createdById: req.user.id,
          description: "Customer account transfer"
        }
      });

      // Record sender debit
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: fromAccountId,
          amount: transferAmount,
          direction: "DEBIT"
        }
      });

      // Record receiver credit
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: toAccountId,
          amount: transferAmount,
          direction: "CREDIT"
        }
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "MONEY_TRANSFERRED",
          entityType: "TRANSACTION",
          entityId: transaction.id,
          metadata: {
            fromAccountId,
            toAccountId,
            amount,
            currency: sourceAccount.currency
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent")
        }
      });

      const updatedSource = await tx.account.findUnique({
        where: { id: fromAccountId },
        select: { balance: true }
      });

      return {
        transactionId: transaction.id,
        amount,
        currency: sourceAccount.currency,
        senderNewBalance: updatedSource.balance.toFixed(2)
      };
    });

    return res.status(201).json({
      message: "Transfer completed successfully",
      ...result
    });

  } catch (error) {
    if (error.message === "SOURCE_ACCOUNT_NOT_AVAILABLE") {
      return res.status(404).json({
        message: "Source account not found or does not belong to you"
      });
    }

    if (error.message === "DESTINATION_ACCOUNT_NOT_AVAILABLE") {
      return res.status(404).json({
        message: "Active destination account not found"
      });
    }

    if (error.message === "CURRENCY_MISMATCH") {
      return res.status(400).json({
        message: "Both accounts must use the same currency"
      });
    }

    if (error.message === "INSUFFICIENT_FUNDS") {
      return res.status(409).json({
        message: "Insufficient balance"
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This transfer request has already been processed"
      });
    }

    console.error("Transfer error:", error);

    return res.status(500).json({
      message: "Unable to process transfer"
    });
  }
});


module.exports = router;
