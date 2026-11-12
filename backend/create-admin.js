
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/db/prisma");

async function createAdmin() {
  try {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("Admin email or password is missing from .env");
    }

    if (password.length < 12) {
      throw new Error("Admin password must contain at least 12 characters");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
  throw new Error("Admin email already exists. We need to update its password separately.");
}

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          fullName: "BalanceVault Administrator",
          email,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE"
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: "ADMIN_BOOTSTRAPPED",
          entityType: "USER",
          entityId: admin.id,
          metadata: {
            method: "local bootstrap script"
          }
        }
      });
    });

    console.log("Admin account created successfully.");
    console.log("You can now log in using your admin credentials.");

  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
