const express = require("express");
const router = express.Router();
const db = require("../db");

/* ============================================================
   1) GET: Lấy danh sách tất cả hộ khẩu
   -> Trả về: ho_khau_id, so_ho_khau, chu_ho, địa chỉ, số thành viên
   ============================================================ */
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                h.ho_khau_id,
                h.so_ho_khau,
                h.chu_ho_cccd,
                p.ho_ten AS ten_chu_ho,
                h.dia_chi,
                COUNT(m.cccd) AS so_thanh_vien
            FROM household h
            JOIN person p ON p.cccd = h.chu_ho_cccd
            LEFT JOIN household_member m ON m.ho_khau_id = h.ho_khau_id
            GROUP BY h.ho_khau_id
        `);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   2) GET: Chi tiết 1 hộ khẩu (bao gồm danh sách members)
   ============================================================ */
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Lấy thông tin hộ + chủ hộ
        const [household] = await db.query(`
            SELECT 
                h.*,
                p.ho_ten AS ten_chu_ho,
                DATE_FORMAT(p.ngay_sinh, '%Y-%m-%d') AS chu_ho_ngay_sinh,
                p.gioi_tinh AS chu_ho_gioi_tinh
            FROM household h
            JOIN person p ON p.cccd = h.chu_ho_cccd
            WHERE ho_khau_id = ?
        `, [id]);

        if (household.length === 0)
            return res.status(404).json({ message: "Không tìm thấy hộ khẩu" });

        // Lấy danh sách member
        const [members] = await db.query(`
            SELECT 
                m.cccd,
                p.ho_ten,
                DATE_FORMAT(p.ngay_sinh, '%Y-%m-%d') AS ngay_sinh,
                p.gioi_tinh,
                m.quan_he,
                p.dan_toc,
                p.ton_giao,
                p.quoc_tich,
                p.dia_chi_thuong_tru,
                DATE_FORMAT(m.ngay_vao, '%Y-%m-%d') AS ngay_vao
            FROM household_member m
            JOIN person p ON p.cccd = m.cccd
            WHERE m.ho_khau_id = ?
        `, [id]);

        res.json({
            ...household[0],
            members
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


/* ============================================================
   3) POST: Tạo hộ khẩu mới
   ============================================================ */
router.post("/", async (req, res) => {
    const {
        so_ho_khau,
        chu_ho_cccd,
        dia_chi
    } = req.body;

    if (!so_ho_khau || !chu_ho_cccd || !dia_chi)
        return res.status(400).json({ message: "Missing required fields" });

    try {
        const [result] = await db.query(`
            INSERT INTO household (so_ho_khau, chu_ho_cccd, dia_chi)
            VALUES (?, ?, ?)
        `, [so_ho_khau, chu_ho_cccd, dia_chi]);

        // auto add chủ hộ vào danh sách thành viên
        await db.query(`
            INSERT INTO household_member (ho_khau_id, cccd, quan_he, ngay_vao)
            VALUES (?, ?, 'Chủ hộ', CURDATE())
        `, [result.insertId, chu_ho_cccd]);

        res.json({ message: "Tạo hộ khẩu thành công!" });

    } catch (err) {
        console.error(err);
        if (err.code === "ER_DUP_ENTRY")
            return res.status(400).json({ message: "Số hộ khẩu đã tồn tại!" });

        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   4) PUT: Cập nhật thông tin hộ khẩu
   ============================================================ */
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
        so_ho_khau,
        chu_ho_cccd,
        dia_chi
    } = req.body;

    if (!so_ho_khau || !chu_ho_cccd || !dia_chi)
        return res.status(400).json({ message: "Missing required fields" });

    try {
        await db.query(`
            UPDATE household 
            SET so_ho_khau=?, chu_ho_cccd=?, dia_chi=?
            WHERE ho_khau_id=?
        `, [so_ho_khau, chu_ho_cccd, dia_chi, id]);

        res.json({ message: "Cập nhật hộ khẩu thành công!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   5) DELETE: Xóa hộ khẩu
   ============================================================ */
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM household WHERE ho_khau_id = ?", [id]);
        res.json({ message: "Xóa hộ khẩu thành công!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   6) POST: Thêm thành viên vào hộ
   ============================================================ */
router.post("/:id/add-member", async (req, res) => {
    const { id } = req.params;
    const { cccd, quan_he } = req.body;

    if (!cccd || !quan_he)
        return res.status(400).json({ message: "Missing data" });

    try {
        await db.query(`
            INSERT INTO household_member (ho_khau_id, cccd, quan_he, ngay_vao)
            VALUES (?, ?, ?, CURDATE())
        `, [id, cccd, quan_he]);

        res.json({ message: "Đã thêm thành viên vào hộ!" });

    } catch (err) {
        console.error(err);
        if (err.code === "ER_DUP_ENTRY")
            return res.status(400).json({ message: "Thành viên đã tồn tại trong hộ!" });

        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   7) DELETE: Xóa thành viên khỏi hộ
   ============================================================ */
router.delete("/:id/remove-member/:cccd", async (req, res) => {
    const { id, cccd } = req.params;

    try {
        await db.query(`
            DELETE FROM household_member
            WHERE ho_khau_id=? AND cccd=?
        `, [id, cccd]);

        res.json({ message: "Đã xóa thành viên khỏi hộ!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   8) GET: Lấy thông tin hộ khẩu theo CCCD của thành viên
   ============================================================ */
router.get("/by-member/:cccd", async (req, res) => {
    const { cccd } = req.params;

    try {
        // Tìm hộ khẩu mà người này là thành viên
        const [household] = await db.query(`
            SELECT 
                h.*,
                p.ho_ten AS ten_chu_ho,
                DATE_FORMAT(p.ngay_sinh, '%Y-%m-%d') AS chu_ho_ngay_sinh,
                p.gioi_tinh AS chu_ho_gioi_tinh
            FROM household_member m
            JOIN household h ON h.ho_khau_id = m.ho_khau_id
            JOIN person p ON p.cccd = h.chu_ho_cccd
            WHERE m.cccd = ?
            LIMIT 1
        `, [cccd]);

        if (household.length === 0)
            return res.status(404).json({ message: "Không tìm thấy hộ khẩu" });

        // Lấy danh sách tất cả thành viên trong hộ này
        const [members] = await db.query(`
            SELECT 
                m.cccd,
                p.ho_ten,
                DATE_FORMAT(p.ngay_sinh, '%Y-%m-%d') AS ngay_sinh,
                p.gioi_tinh,
                m.quan_he,
                p.dan_toc,
                p.ton_giao,
                p.quoc_tich,
                p.dia_chi_thuong_tru,
                DATE_FORMAT(m.ngay_vao, '%Y-%m-%d') AS ngay_vao
            FROM household_member m
            JOIN person p ON p.cccd = m.cccd
            WHERE m.ho_khau_id = ?
        `, [household[0].ho_khau_id]);

        res.json({
            ...household[0],
            members
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;


function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // Month 0-11
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}