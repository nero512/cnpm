CREATE DATABASE qlydancu;

USE qlydancu;

-- Bảng person
CREATE TABLE person (
    cccd VARCHAR(12) PRIMARY KEY,
    ho_ten VARCHAR(200) NOT NULL,
    ngay_sinh DATE NOT NULL,
    gioi_tinh ENUM('Nam','Nữ','Khác') DEFAULT 'Khác',
    dan_toc VARCHAR(50),
    ton_giao VARCHAR(50),
    quoc_tich VARCHAR(50) DEFAULT 'Việt Nam',
    dia_chi_thuong_tru VARCHAR(255),
    tinh_trang_cu_tru ENUM('Thường trú','Tạm trú') DEFAULT 'Thường trú',
    quan_he_voi_chu_ho VARCHAR(50),
    ngay_dang_ky DATE,
    ten_cha VARCHAR(200),
    cccd_cha VARCHAR(12),
    ten_me VARCHAR(200),
    cccd_me VARCHAR(12),
    trang_thai_nhan_than ENUM('Đang sống','Đã qua đời','Mất tích') DEFAULT 'Đang sống',
    ngay_tu_vong DATE,
    so_giay_bao_tu VARCHAR(50),
    INDEX idx_ho_ten (ho_ten),
    INDEX idx_ngay_sinh (ngay_sinh)
);

-- Bảng household
CREATE TABLE household (
    ho_khau_id INT AUTO_INCREMENT PRIMARY KEY,
    so_ho_khau VARCHAR(20) UNIQUE NOT NULL,
    chu_ho_cccd VARCHAR(12) NOT NULL,
    so_nha VARCHAR(100),
    duong_pho VARCHAR(100),
    phuong_xa VARCHAR(100),
    quan_huyen VARCHAR(100),
    dia_chi VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chu_ho_cccd) REFERENCES person(cccd)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Bảng household_member
CREATE TABLE household_member (
    ho_khau_id INT NOT NULL,
    cccd VARCHAR(12) NOT NULL,
    quan_he VARCHAR(50) NOT NULL,
    ngay_vao DATE,
    PRIMARY KEY (ho_khau_id, cccd),
    FOREIGN KEY (ho_khau_id) REFERENCES household(ho_khau_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (cccd) REFERENCES person(cccd)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Bảng event
CREATE TABLE event (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    loai VARCHAR(100) NOT NULL,
    tieu_de VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    thoi_gian_bat_dau DATETIME NOT NULL,
    thoi_gian_ket_thuc DATETIME,
    dia_diem VARCHAR(200),
    nguoi_phu_trach VARCHAR(200),
    trang_thai ENUM('Sắp diễn ra','Đã tổ chức','Thông báo đang hiệu lực') DEFAULT 'Sắp diễn ra'
);

-- Bảng account
CREATE TABLE account (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') DEFAULT 'user',
    person_cccd VARCHAR(12),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_cccd) REFERENCES person(cccd)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Bảng request
CREATE TABLE request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    person_cccd VARCHAR(12) NOT NULL,
    request_type ENUM('Điều chỉnh thông tin', 'Khai hộ') NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    request_data JSON,
    status ENUM('Đang xử lý', 'Đã duyệt', 'Không xử lý') DEFAULT 'Đang xử lý',
    admin_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_cccd) REFERENCES person(cccd)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Dữ liệu mẫu person
INSERT INTO person (cccd, ho_ten, ngay_sinh, gioi_tinh, dan_toc, ton_giao, quoc_tich, dia_chi_thuong_tru, tinh_trang_cu_tru, quan_he_voi_chu_ho, ngay_dang_ky, ten_cha, cccd_cha, ten_me, cccd_me, trang_thai_nhan_than)
VALUES
('001234567890', 'Nguyễn Văn A', '1980-05-10', 'Nam', 'Kinh', 'Không', 'Việt Nam', '12/3 Đường ABC, Phường XYZ', 'Thường trú', 'Chủ hộ', '2000-01-01', 'Nguyễn Văn X', NULL, 'Trần Thị Y', NULL, 'Đang sống'),
('001234567891', 'Trần Thị B', '1985-07-12', 'Nữ', 'Kinh', 'Không', 'Việt Nam', '12/3 Đường ABC, Phường XYZ', 'Thường trú', 'Vợ/Chồng', '2005-01-01', 'Trần Văn Z', NULL, 'Lê Thị M', NULL, 'Đang sống'),
('001234567892', 'Nguyễn Văn C', '2010-03-25', 'Nam', 'Kinh', 'Không', 'Việt Nam', '12/3 Đường ABC, Phường XYZ', 'Thường trú', 'Con', '2010-03-25', 'Nguyễn Văn A', NULL, 'Trần Thị B', NULL, 'Đang sống'),
('001234567893', 'Lê Thị D', '1975-02-20', 'Nữ', 'Kinh', 'Không', 'Việt Nam', '45/2 Đường DEF, Phường PQR', 'Thường trú', 'Chủ hộ', '1995-05-01', 'Lê Văn U', NULL, 'Phạm Thị V', NULL, 'Đang sống'),
('001234567894', 'Lê Văn E', '1974-11-11', 'Nam', 'Kinh', 'Không', 'Việt Nam', '45/2 Đường DEF, Phường PQR', 'Thường trú', 'Vợ', '1995-05-01', 'Lê Văn Q', NULL, 'Hoàng Thị R', NULL, 'Đang sống'),
('001234567895', 'Phạm Văn F', '1990-08-08', 'Nam', 'Kinh', 'Không', 'Việt Nam', '78/9 Đường GHI, Phường STU', 'Thường trú', 'Chủ hộ', '2010-09-01', 'Phạm Văn K', NULL, 'Nguyễn Thị L', NULL, 'Đang sống'),
('001234567896', 'Nguyễn Thị G', '1992-04-04', 'Nữ', 'Kinh', 'Không', 'Việt Nam', '78/9 Đường GHI, Phường STU', 'Thường trú', 'Vợ', '2010-09-01', 'Nguyễn Văn M', NULL, 'Trần Thị N', NULL, 'Đang sống');

-- Dữ liệu mẫu household
INSERT INTO household (so_ho_khau, chu_ho_cccd, so_nha, duong_pho, phuong_xa, quan_huyen)
VALUES
('HK001', '001234567890', '12/3', 'Đường ABC', 'Phường XYZ', 'Quận 1'),
('HK002', '001234567893', '45/2', 'Đường DEF', 'Phường PQR', 'Quận 5'),
('HK003', '001234567895', '78/9', 'Đường GHI', 'Phường STU', 'Quận 3');

-- Dữ liệu mẫu household_member
INSERT INTO household_member (ho_khau_id, cccd, quan_he, ngay_vao)
VALUES
(1, '001234567890', 'Chủ hộ', '2000-01-01'),
(1, '001234567891', 'Vợ', '2005-01-01'),
(1, '001234567892', 'Con', '2010-03-25'),
(2, '001234567893', 'Chủ hộ', '1995-05-01'),
(2, '001234567894', 'Vợ', '1995-05-01'),
(3, '001234567895', 'Chủ hộ', '2010-09-01'),
(3, '001234567896', 'Vợ', '2010-09-01');

-- Dữ liệu mẫu account
INSERT INTO account (username, password, role, person_cccd)
VALUES
('admin_nguyen', 'admin123', 'admin', '001234567890'),
('user_lethi', 'user123', 'user', '001234567893'),
('user_pham', 'user123', 'user', '001234567895');

-- Dữ liệu mẫu event
INSERT INTO event (loai, tieu_de, mo_ta, thoi_gian_bat_dau, thoi_gian_ket_thuc, dia_diem, nguoi_phu_trach, trang_thai)
VALUES
('Họp Tổ dân phố', 'Họp tổng kết tháng 11', 'Tổng kết tình hình an ninh và vệ sinh.', '2025-11-20 14:00:00', '2025-11-20 16:00:00', 'Nhà văn hóa tổ', 'Ông Nguyễn Văn A', 'Sắp diễn ra');