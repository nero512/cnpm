const db = require("./db");

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1 + 1 AS result");
        console.log("MySQL connected! Result:", rows[0]);
    } catch (err) {
        console.error("Database connection failed:", err);
    }
}

testConnection();
