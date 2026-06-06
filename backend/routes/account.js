const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
    }

    try {
        const [rows] = await db.query(
            "SELECT username, role, person_cccd FROM account WHERE username = ? AND password = ?",
            [username, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        }

        return res.json({
            message: "Đăng nhập thành công!",
            role: rows[0].role,
            person_cccd: rows[0].person_cccd
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
