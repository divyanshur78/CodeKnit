
import { pool } from "./config/database";

async function testDatabase() {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    console.log("Database connection successful!");
    console.log("PostgreSQL time:", result.rows[0].current_time);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await pool.end();
  }
}

testDatabase();
