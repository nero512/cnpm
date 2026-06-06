// household_members.js - PHẦN 3: XỬ LÝ THÀNH VIÊN
// Thêm code này vào cuối file household_script.js HOẶC tạo file riêng và import

// ========== TOGGLE ADD MEMBER FORM ==========
document.getElementById('toggleAddMemberBtn').addEventListener('click', () => {
  const container = document.getElementById('addMemberContainer');
  container.classList.toggle('d-none');
  
  if (!container.classList.contains('d-none')) {
    document.getElementById('addMemberForm').reset();
    editingMemberCCCD = null;
    setTimeout(() => document.getElementById('m_cccd').focus(), 100);
  }
});

function cancelAddMember() {
  document.getElementById('addMemberContainer').classList.add('d-none');
  document.getElementById('addMemberForm').reset();
  document.getElementById('addMemberAlert').classList.add('d-none');
  editingMemberCCCD = null;
}
window.cancelAddMember = cancelAddMember;

// ========== KIỂM TRA CCCD THÀNH VIÊN ==========
document.getElementById('btnCheckMemberCCCD').addEventListener('click', async () => {
  const cccd = document.getElementById('m_cccd').value.trim();
  if (!cccd) {
    showAlert('Vui lòng nhập CCCD trước', 'warning', 'addMemberAlert');
    return;
  }

  try {
    showLoading();
    const res = await fetch(`${API_BASE}/persons/${cccd}`);
    
    if (res.ok) {
      const person = await res.json();
      document.getElementById('m_ho_ten').value = person.name || '';
      document.getElementById('m_gioi_tinh').value = person.gioiTinh || 'Nam';
      document.getElementById('m_ngay_sinh').value = person.ngaySinh || '';
      document.getElementById('m_dan_toc').value = person.danToc || 'Kinh';
      document.getElementById('m_ton_giao').value = person.tonGiao || 'Không';
      document.getElementById('m_quoc_tich').value = person.quocTich || 'Việt Nam';
      
      showAlert('Đã tìm thấy thông tin! Vui lòng chọn quan hệ.', 'success', 'addMemberAlert');
    } else {
      showAlert('CCCD chưa tồn tại. Vui lòng nhập đầy đủ thông tin để tạo mới.', 'info', 'addMemberAlert');
    }
  } catch (err) {
    console.error(err);
    showAlert('Lỗi khi kiểm tra CCCD', 'danger', 'addMemberAlert');
  } finally {
    hideLoading();
  }
});

// ========== THÊM THÀNH VIÊN VÀO HỘ ==========
document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentDetailHouseholdId) {
    showAlert('Không xác định được hộ khẩu', 'danger', 'addMemberAlert');
    return;
  }

  const cccd = document.getElementById('m_cccd').value.trim();
  const ho_ten = document.getElementById('m_ho_ten').value.trim();
  const quan_he = document.getElementById('m_quan_he').value;
  const ngay_sinh = document.getElementById('m_ngay_sinh').value;
  const gioi_tinh = document.getElementById('m_gioi_tinh').value;
  const dan_toc = document.getElementById('m_dan_toc').value.trim();
  const ton_giao = document.getElementById('m_ton_giao').value.trim();
  const quoc_tich = document.getElementById('m_quoc_tich').value.trim();

  if (!cccd || !ho_ten || !quan_he) {
    showAlert('Vui lòng điền đầy đủ CCCD, Họ tên và Quan hệ', 'warning', 'addMemberAlert');
    return;
  }

  try {
    showLoading();
    
    // Bước 1: Kiểm tra person có tồn tại không
    const checkPerson = await fetch(`${API_BASE}/persons/${cccd}`);
    
    if (!checkPerson.ok) {
      // Tạo person mới
      const personData = {
        cccd,
        name: ho_ten,
        ngaySinh: ngay_sinh || null,
        gioiTinh: gioi_tinh,
        danToc: dan_toc,
        tonGiao: ton_giao,
        quocTich: quoc_tich,
        tinhTrangCuTru: 'Thường trú',
        quanHe: quan_he,
        ngayDangKy: new Date().toISOString().split('T')[0]
      };
      
      const createPerson = await fetch(`${API_BASE}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });
      
      if (!createPerson.ok) {
        const err = await createPerson.json();
        throw new Error(err.error || 'Không thể tạo thông tin thành viên');
      }
    }

    // Bước 2: Thêm vào household_member
    const addMemberRes = await fetch(`${API_BASE}/household/${currentDetailHouseholdId}/add-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cccd, quan_he })
    });

    if (!addMemberRes.ok) {
      const err = await addMemberRes.json();
      throw new Error(err.message || 'Không thể thêm thành viên vào hộ');
    }

    alert('Thêm thành viên thành công!');
    cancelAddMember();
    
    // Reload household details
    await viewHousehold(currentDetailHouseholdId);
    await loadHouseholds(); // Cập nhật số lượng thành viên trong table chính

  } catch (err) {
    console.error(err);
    showAlert(err.message || 'Có lỗi xảy ra', 'danger', 'addMemberAlert');
  } finally {
    hideLoading();
  }
});

// ========== XÓA THÀNH VIÊN KHỎI HỘ ==========
async function deleteMember(cccd) {
  if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi hộ?')) return;
  
  if (!currentDetailHouseholdId) {
    alert('Không xác định được hộ khẩu');
    return;
  }

  try {
    showLoading();
    const res = await fetch(`${API_BASE}/household/${currentDetailHouseholdId}/remove-member/${cccd}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Không thể xóa thành viên');
    
    alert('Xóa thành viên thành công!');
    
    // Reload household details
    await viewHousehold(currentDetailHouseholdId);
    await loadHouseholds(); // Cập nhật số lượng
    
  } catch (err) {
    console.error(err);
    alert('Có lỗi xảy ra khi xóa thành viên');
  } finally {
    hideLoading();
  }
}
window.deleteMember = deleteMember;

// ========== SỬA HỘ TỪ MODAL CHI TIẾT ==========
document.getElementById('editHouseholdFromDetailBtn').addEventListener('click', () => {
  if (!currentDetailHouseholdId) return;
  
  householdDetailModal.hide();
  
  setTimeout(() => {
    openEditHousehold(currentDetailHouseholdId);
  }, 300);
});

// ========== GHI CHÚ TÍCH HỢP ==========
/*
  ĐỂ SỬ DỤNG CODE NÀY:
  
  1. Lưu file HTML chính: ad_quan_ly_ho_khau.html
  
  2. Tạo file household_script.js với nội dung:
     - Copy toàn bộ PHẦN 2 (household_script.js)
     - Tiếp theo copy toàn bộ PHẦN 3 (household_members.js) vào cuối
  
  3. Hoặc tách thành 2 file:
     - household_script.js (Phần 2)
     - household_members.js (Phần 3)
     
     Sau đó trong HTML thêm:
     <script src="household_script.js"></script>
     <script src="household_members.js"></script>

  4. Đảm bảo server đang chạy tại http://localhost:3000
  
  5. Cấu trúc database phải khớp với schema trong quanlydancu.sql
  
  TÍNH NĂNG:
  ✅ Tự động kiểm tra CCCD đã tồn tại
  ✅ Tạo person mới nếu chưa có
  ✅ Tạo/Sửa/Xóa hộ khẩu
  ✅ Thêm/Xóa thành viên
  ✅ Search & filter
  ✅ Responsive UI
  ✅ Loading states
  ✅ Error handling
*/