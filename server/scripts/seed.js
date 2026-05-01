import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import { User } from "../src/models.js";

async function main() {
  await connectDB();

  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  await User.updateOne(
    { email: "admin@example.com" },
    {
      $setOnInsert: {
        name: "Admin User",
        email: "admin@example.com",
        passwordHash,
        role: "ADMIN"
      }
    },
    { upsert: true }
  );

  console.log("Seed admin ready: admin@example.com / Admin@12345");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
