// routes/person.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // file kết nối MySQL, export pool hoặc connection


function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // Month 0-11
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
// Hàm map dữ liệu DB sang frontend
function mapDBToFrontend(row) {
  return {
    cccd: row.cccd,
    name: row.ho_ten,
    ngaySinh: formatDate(row.ngay_sinh),
    gioiTinh: row.gioi_tinh,
    danToc: row.dan_toc,
    tonGiao: row.ton_giao,
    quocTich: row.quoc_tich,
    diaChi: row.dia_chi_thuong_tru,
    tinhTrangCuTru: row.tinh_trang_cu_tru,
    quanHe: row.quan_he_voi_chu_ho,
    ngayDangKy: row.ngay_dang_ky,
    tenCha: row.ten_cha,
    cccdCha: row.cccd_cha,
    tenMe: row.ten_me,
    cccdMe: row.cccd_me,
    status: row.trang_thai_nhan_than,
    death_date: row.ngay_tu_vong,
    death_cert: row.so_giay_bao_tu
  };
}

// ---------------------------
// GET /persons
// Lấy danh sách nhân khẩu với filter / search / sort
// ---------------------------
router.get('/', async (req, res) => {
  try {
    const { search, gender, residence, status, sortKey, sortDir } = req.query;
    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(ho_ten LIKE ? OR cccd LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (gender && gender !== 'All') {
      conditions.push('gioi_tinh = ?');
      params.push(gender);
    }
    if (residence && residence !== 'All') {
      conditions.push('tinh_trang_cu_tru = ?');
      params.push(residence);
    }
    if (status && status !== 'All') {
      conditions.push('trang_thai_nhan_than = ?');
      params.push(status);
    }

    let sql = 'SELECT * FROM person';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    // Sorting
    if (sortKey) {
      const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
      const safeColumns = ['cccd','ho_ten','ngay_sinh','gioi_tinh','trang_thai_nhan_than'];
      if (safeColumns.includes(sortKey)) {
        sql += ` ORDER BY ${sortKey} ${dir}`;
      }
    }

    const [rows] = await db.query(sql, params);
    const mapped = rows.map(mapDBToFrontend);
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ---------------------------
// GET /persons/:cccd
// Lấy chi tiết nhân khẩu
// ---------------------------
router.get('/:cccd', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM person WHERE cccd = ?', [req.params.cccd]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy nhân khẩu' });
    res.json(mapDBToFrontend(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ---------------------------
// POST /persons
// Thêm nhân khẩu mới
// ---------------------------
router.post('/', async (req, res) => {
  try {
    const {
      cccd, name, ngaySinh, gioiTinh, danToc, tonGiao, quocTich,
      diaChi, tinhTrangCuTru, quanHe, ngayDangKy, tenCha, cccdCha, tenMe, cccdMe
    } = req.body;

    if (!cccd || !name || !ngaySinh) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    }

    await db.query(
      `INSERT INTO person
      (cccd, ho_ten, ngay_sinh, gioi_tinh, dan_toc, ton_giao, quoc_tich, dia_chi_thuong_tru, tinh_trang_cu_tru, quan_he_voi_chu_ho, ngay_dang_ky, ten_cha, cccd_cha, ten_me, cccd_me)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cccd, name, ngaySinh, gioiTinh, danToc, tonGiao, quocTich, diaChi, tinhTrangCuTru, quanHe, ngayDangKy, tenCha, cccdCha, tenMe, cccdMe]
    );

    res.status(201).json({ message: 'Thêm nhân khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server hoặc CCCD đã tồn tại' });
  }
});

// ---------------------------
// PUT /persons/:cccd
// Chỉnh sửa nhân khẩu
// ---------------------------
router.put('/:cccd', async (req, res) => {
  try {
    const { cccd } = req.params;
    const fields = req.body;

    // map frontend key về DB key
    const keyMap = {
      name: 'ho_ten',
      ngaySinh: 'ngay_sinh',
      gioiTinh: 'gioi_tinh',
      danToc: 'dan_toc',
      tonGiao: 'ton_giao',
      quocTich: 'quoc_tich',
      diaChi: 'dia_chi_thuong_tru',
      tinhTrangCuTru: 'tinh_trang_cu_tru',
      quanHe: 'quan_he_voi_chu_ho',
      ngayDangKy: 'ngay_dang_ky',
      tenCha: 'ten_cha',
      cccdCha: 'cccd_cha',
      tenMe: 'ten_me',
      cccdMe: 'cccd_me',
      status: 'trang_thai_nhan_than',
      death_date: 'ngay_tu_vong',
      death_cert: 'so_giay_bao_tu'
    };

    const setParts = [];
    const params = [];
    for (const key in fields) {
      if (keyMap[key]) {
        setParts.push(`${keyMap[key]} = ?`);
        params.push(fields[key]);
      }
    }

    if (setParts.length === 0) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
    params.push(cccd);

    const sql = `UPDATE person SET ${setParts.join(', ')} WHERE cccd = ?`;
    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy nhân khẩu' });
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ---------------------------
// PATCH /persons/:cccd/status
// Cập nhật tình trạng nhân thân
// ---------------------------
router.patch('/:cccd/status', async (req, res) => {
  try {
    const { cccd } = req.params;
    const { status, death_date, death_cert } = req.body;

    if (!status) return res.status(400).json({ error: 'Thiếu trạng thái' });

    const sql = `UPDATE person 
                 SET trang_thai_nhan_than = ?, ngay_tu_vong = ?, so_giay_bao_tu = ? 
                 WHERE cccd = ?`;
    const [result] = await db.query(sql, [status, death_date || null, death_cert || null, cccd]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy nhân khẩu' });

    res.json({ message: 'Cập nhật tình trạng thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ---------------------------
// DELETE /persons/:cccd
// ---------------------------
router.delete('/:cccd', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM person WHERE cccd = ?', [req.params.cccd]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Không tìm thấy nhân khẩu' });
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
