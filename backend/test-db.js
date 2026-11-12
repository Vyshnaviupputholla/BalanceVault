const prisma = require("./src/db/prisma");

async function testDatabase() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1");
    console.log("Database connection successful!");
    console.log(result);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();