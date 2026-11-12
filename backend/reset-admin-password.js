
require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/db/prisma");

async function resetAdmin() {
  try {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
      throw new Error("Check admin email and password in .env");
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" }
    });

    if (admins.length !== 1) {
      throw new Error("Expected exactly one existing admin account");
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail && existingEmail.id !== admins[0].id) {
      throw new Error("Configured email belongs to another user");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: admins[0].id },
        data: {
          email,
          passwordHash,
          status: "ACTIVE"
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: "ADMIN_ACCOUNT_UPDATED",
          entityType: "USER",
          entityId: admins[0].id,
          metadata: {
            method: "local admin recovery script"
          }
        }
      });
    });

    console.log("Admin email and password updated successfully.");

  } catch (error) {
    console.error("Admin recovery failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
