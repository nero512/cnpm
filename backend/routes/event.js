// routes/event.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ===========================
// Utils
// ===========================
function formatDateTime(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// Map DB → Frontend
function mapDBToFrontend(row) {
  return {
    id: row.event_id,
    loai: row.loai,
    tieuDe: row.tieu_de,
    moTa: row.mo_ta,
    thoiGianBatDau: formatDateTime(row.thoi_gian_bat_dau),
    thoiGianKetThuc: formatDateTime(row.thoi_gian_ket_thuc),
    diaDiem: row.dia_diem,
    nguoiPhuTrach: row.nguoi_phu_trach,
    trangThai: row.trang_thai
  };
}

// ===========================
// GET /events
// Danh sách + search + filter + sort
// ===========================
router.get('/', async (req, res) => {
  try {
    const { search, loai, trangThai, sortKey, sortDir } = req.query;
    let conditions = [];
    let params = [];

    // Search
    if (search) {
      conditions.push('(tieu_de LIKE ? OR mo_ta LIKE ? OR dia_diem LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filter
    if (loai && loai !== 'All') {
      conditions.push('loai = ?');
      params.push(loai);
    }

    if (trangThai && trangThai !== 'All') {
      conditions.push('trang_thai = ?');
      params.push(trangThai);
    }

    let sql = 'SELECT * FROM event';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    // Sort
    if (sortKey) {
      const dir = sortDir === 'desc' ? 'DESC' : 'ASC';
      const safeColumns = [
        'tieu_de',
        'loai',
        'thoi_gian_bat_dau',
        'trang_thai'
      ];
      if (safeColumns.includes(sortKey)) {
        sql += ` ORDER BY ${sortKey} ${dir}`;
      }
    } else {
      sql += ' ORDER BY thoi_gian_bat_dau DESC';
    }

    const [rows] = await db.query(sql, params);
    res.json(rows.map(mapDBToFrontend));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ===========================
// GET /events/:id
// Chi tiết 1 sự kiện
// ===========================
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM event WHERE event_id = ?',
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    res.json(mapDBToFrontend(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ===========================
// POST /events
// Thêm lịch sinh hoạt
// ===========================
router.post('/', async (req, res) => {
  try {
    const {
      loai,
      tieuDe,
      moTa,
      thoiGianBatDau,
      thoiGianKetThuc,
      diaDiem,
      nguoiPhuTrach,
      trangThai
    } = req.body;

    if (!loai || !tieuDe || !thoiGianBatDau) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    }

    await db.query(
      `INSERT INTO event
      (loai, tieu_de, mo_ta, thoi_gian_bat_dau, thoi_gian_ket_thuc, dia_diem, nguoi_phu_trach, trang_thai)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loai,
        tieuDe,
        moTa || null,
        thoiGianBatDau,
        thoiGianKetThuc || null,
        diaDiem || null,
        nguoiPhuTrach || null,
        trangThai || 'Sắp diễn ra'
      ]
    );

    res.status(201).json({ message: 'Thêm lịch sinh hoạt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ===========================
// PUT /events/:id
// Chỉnh sửa lịch sinh hoạt
// ===========================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const keyMap = {
      loai: 'loai',
      tieuDe: 'tieu_de',
      moTa: 'mo_ta',
      thoiGianBatDau: 'thoi_gian_bat_dau',
      thoiGianKetThuc: 'thoi_gian_ket_thuc',
      diaDiem: 'dia_diem',
      nguoiPhuTrach: 'nguoi_phu_trach',
      trangThai: 'trang_thai'
    };

    const setParts = [];
    const params = [];

    for (const key in fields) {
      if (keyMap[key]) {
        setParts.push(`${keyMap[key]} = ?`);
        params.push(fields[key]);
      }
    }

    if (setParts.length === 0)
      return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });

    params.push(id);

    const sql = `UPDATE event SET ${setParts.join(', ')} WHERE event_id = ?`;
    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    res.json({ message: 'Cập nhật lịch sinh hoạt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ===========================
// PATCH /events/:id/status
// Cập nhật trạng thái
// ===========================
router.patch('/:id/status', async (req, res) => {
  try {
    const { trangThai } = req.body;
    if (!trangThai)
      return res.status(400).json({ error: 'Thiếu trạng thái' });

    const [result] = await db.query(
      'UPDATE event SET trang_thai = ? WHERE event_id = ?',
      [trangThai, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ===========================
// DELETE /events/:id
// ===========================
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM event WHERE event_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    res.json({ message: 'Xóa lịch sinh hoạt thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
