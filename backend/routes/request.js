// routes/request.js - ĐÃ SỬA LỖI
const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function to generate unique request code
function generateRequestCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RQ${timestamp}${random}`;
}

// ============================================================
// 3) GET /api/requests/:id - FIXED JSON PARSING
// Lấy chi tiết 1 request
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        r.*,
        p.ho_ten AS sender_name
      FROM request r
      JOIN person p ON r.person_cccd = p.cccd
      WHERE r.request_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    const request = rows[0];

    // QUAN TRỌNG: Parse request_data nếu nó là string
    if (request.request_data && typeof request.request_data === 'string') {
      try {
        request.request_data = JSON.parse(request.request_data);
      } catch (e) {
        console.error('Không thể parse request_data:', e);
      }
    }

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============================================================
// 2) GET /api/requests (Admin only) - FIXED
// Lấy tất cả request với filter
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let conditions = [];
    let params = [];

    // Filter by status
    if (status && status !== 'all') {
      conditions.push('r.status = ?');
      params.push(status);
    }

    // Search by CCCD or name
    if (search) {
      conditions.push('(r.person_cccd LIKE ? OR p.ho_ten LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    let sql = `
      SELECT 
        r.request_id,
        r.request_code,
        r.person_cccd,
        r.request_type,
        r.title,
        r.content,
        r.request_data,
        r.status,
        r.admin_feedback,
        r.created_at,
        r.updated_at,
        p.ho_ten AS sender_name
      FROM request r
      JOIN person p ON r.person_cccd = p.cccd
    `;

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await db.query(sql, params);
    
    // Parse request_data cho tất cả rows
    rows.forEach(row => {
      if (row.request_data && typeof row.request_data === 'string') {
        try {
          row.request_data = JSON.parse(row.request_data);
        } catch (e) {
          console.error('Không thể parse request_data:', e);
        }
      }
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============================================================
// 1) GET /api/requests/my/:cccd
// Lấy tất cả request của user (theo CCCD)
// ============================================================
router.get('/my/:cccd', async (req, res) => {
  try {
    const { cccd } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        request_id,
        request_code,
        person_cccd,
        request_type,
        title,
        content,
        status,
        admin_feedback,
        created_at,
        updated_at
      FROM request
      WHERE person_cccd = ?
      ORDER BY created_at DESC
    `, [cccd]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============================================================
// 4) POST /api/requests
// Tạo request mới
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      person_cccd,
      request_type,
      title,
      content,
      request_data
    } = req.body;

    // Validation
    if (!person_cccd || !request_type || !title) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    }

    // Validate request_type
    const validTypes = ['Điều chỉnh thông tin', 'Khai hộ'];
    if (!validTypes.includes(request_type)) {
      return res.status(400).json({ error: 'Loại yêu cầu không hợp lệ' });
    }

    // Generate unique request code
    const request_code = generateRequestCode();

    // Insert into database
    await db.query(`
      INSERT INTO request 
      (request_code, person_cccd, request_type, title, content, request_data, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Đang xử lý')
    `, [
      request_code,
      person_cccd,
      request_type,
      title,
      content || null,
      request_data ? JSON.stringify(request_data) : null
    ]);

    res.status(201).json({ 
      message: 'Tạo yêu cầu thành công',
      request_code 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============================================================
// 5) PUT /api/requests/:id/approve - FIXED
// Duyệt request - Tự động cập nhật database
// ============================================================
router.put('/:id/approve', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { admin_feedback } = req.body;

    if (!admin_feedback || !admin_feedback.trim()) {
      return res.status(400).json({ error: 'Phản hồi không được để trống' });
    }

    // Lấy thông tin request
    const [requests] = await connection.query(
      'SELECT * FROM request WHERE request_id = ?',
      [id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    const request = requests[0];

    // Kiểm tra đã xử lý chưa
    if (request.status !== 'Đang xử lý') {
      await connection.rollback();
      return res.status(400).json({ error: 'Yêu cầu đã được xử lý trước đó' });
    }

    // Parse request_data
    let data;
    if (typeof request.request_data === 'string') {
      data = JSON.parse(request.request_data);
    } else {
      data = request.request_data;
    }

    // === XỬ LÝ THEO LOẠI REQUEST ===
    if (request.request_type === 'Điều chỉnh thông tin') {
      // Build UPDATE query động
      const updates = [];
      const values = [];

      if (data.ho_ten) {
        updates.push('ho_ten = ?');
        values.push(data.ho_ten);
      }
      if (data.gioi_tinh) {
        updates.push('gioi_tinh = ?');
        values.push(data.gioi_tinh);
      }
      if (data.quoc_tich) {
        updates.push('quoc_tich = ?');
        values.push(data.quoc_tich);
      }
      if (data.ton_giao) {
        updates.push('ton_giao = ?');
        values.push(data.ton_giao);
      }

      if (updates.length > 0) {
        values.push(request.person_cccd);
        await connection.query(
          `UPDATE person SET ${updates.join(', ')} WHERE cccd = ?`,
          values
        );
      }

    } else if (request.request_type === 'Khai hộ') {
      // 1. Thêm vào bảng person
      await connection.query(`
        INSERT INTO person 
        (cccd, ho_ten, ngay_sinh, gioi_tinh, dan_toc, ton_giao, quoc_tich, 
         dia_chi_thuong_tru, tinh_trang_cu_tru, quan_he_voi_chu_ho, ngay_dang_ky,
         ten_cha, cccd_cha, ten_me, cccd_me, trang_thai_nhan_than)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Đang sống')
      `, [
        data.cccd,
        data.ho_ten,
        data.ngay_sinh,
        data.gioi_tinh,
        data.dan_toc || null,
        data.ton_giao || null,
        data.quoc_tich || 'Việt Nam',
        data.dia_chi,
        data.tinh_trang_cu_tru || 'Thường trú',
        data.quan_he,
        data.ngay_dang_ky || new Date().toISOString().split('T')[0],
        data.ten_cha,
        data.cccd_cha || null,
        data.ten_me,
        data.cccd_me || null
      ]);

      // 2. Tìm hộ khẩu của người gửi request
      const [households] = await connection.query(`
        SELECT ho_khau_id 
        FROM household_member 
        WHERE cccd = ?
        LIMIT 1
      `, [request.person_cccd]);

      if (households.length > 0) {
        const ho_khau_id = households[0].ho_khau_id;

        // 3. Thêm vào household_member
        await connection.query(`
          INSERT INTO household_member 
          (ho_khau_id, cccd, quan_he, ngay_vao)
          VALUES (?, ?, ?, CURDATE())
        `, [ho_khau_id, data.cccd, data.quan_he]);
      }
    }

    // Cập nhật trạng thái request
    await connection.query(`
      UPDATE request 
      SET status = 'Đã duyệt', admin_feedback = ?
      WHERE request_id = ?
    `, [admin_feedback.trim(), id]);

    await connection.commit();
    res.json({ message: 'Duyệt yêu cầu thành công' });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'CCCD đã tồn tại trong hệ thống' });
    }
    
    res.status(500).json({ error: 'Lỗi khi xử lý yêu cầu', details: err.message });
  } finally {
    connection.release();
  }
});

// ============================================================
// 6) PUT /api/requests/:id/reject
// Từ chối request - Chỉ lưu feedback
// ============================================================
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_feedback } = req.body;

    if (!admin_feedback || !admin_feedback.trim()) {
      return res.status(400).json({ error: 'Phản hồi không được để trống' });
    }

    // Kiểm tra request tồn tại
    const [requests] = await db.query(
      'SELECT status FROM request WHERE request_id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    }

    if (requests[0].status !== 'Đang xử lý') {
      return res.status(400).json({ error: 'Yêu cầu đã được xử lý trước đó' });
    }

    // Cập nhật trạng thái
    await db.query(`
      UPDATE request 
      SET status = 'Không xử lý', admin_feedback = ?
      WHERE request_id = ?
    `, [admin_feedback.trim(), id]);

    res.json({ message: 'Đã từ chối yêu cầu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ============================================================
// 7) GET /api/requests/stats/summary
// Lấy thống kê (cho admin)
// ============================================================
router.get('/stats/summary', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Đang xử lý' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Đã duyệt' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Không xử lý' THEN 1 ELSE 0 END) as rejected
      FROM request
    `);

    res.json(stats[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;