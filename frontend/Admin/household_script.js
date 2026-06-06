// household_script.js - PHẦN 2: JAVASCRIPT CHÍNH
const API_BASE = 'http://localhost:3000/api';

let households = [];
let currentDetailHouseholdId = null;
let editingMemberCCCD = null;

// DOM refs
const householdsTbody = document.getElementById('householdsTbody');
const membersTbody = document.getElementById('membersTbody');
const statHouseholds = document.getElementById('statHouseholds');
const statMembers = document.getElementById('statMembers');
const statAvg = document.getElementById('statAvg');
const loadingOverlay = document.getElementById('loadingOverlay');

// Modals
const householdAddModalEl = document.getElementById('householdAddModal');
const householdAddModal = new bootstrap.Modal(householdAddModalEl);
const householdDetailModalEl = document.getElementById('householdDetailModal');
const householdDetailModal = new bootstrap.Modal(householdDetailModalEl);

// ========== UTILITIES ==========
function showLoading() { loadingOverlay.classList.add('active'); }
function hideLoading() { loadingOverlay.classList.remove('active'); }

function showAlert(message, type = 'danger', elementId = 'formAlertHousehold') {
  const alertBox = document.getElementById(elementId);
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.classList.remove('d-none');
  setTimeout(() => alertBox.classList.add('d-none'), 5000);
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function goTo(p) { window.location.href = p; }
function logout() { localStorage.removeItem('username'); window.location.href = '/'; }

// ========== LOAD & RENDER HOUSEHOLDS ==========
async function loadHouseholds() {
  try {
    showLoading();
    const res = await fetch(`${API_BASE}/household`);
    if (!res.ok) throw new Error('Lỗi khi tải dữ liệu');
    households = await res.json();
    renderHouseholdsTable();
    updateStats();
  } catch (err) {
    console.error(err);
    alert('Không thể tải dữ liệu hộ khẩu. Vui lòng kiểm tra server đang chạy tại http://localhost:3000');
  } finally {
    hideLoading();
  }
}

function updateStats() {
  const totalHouseholds = households.length;
  const totalMembers = households.reduce((s, h) => s + (parseInt(h.so_thanh_vien) || 0), 0);
  statHouseholds.textContent = totalHouseholds;
  statMembers.textContent = totalMembers;
  statAvg.textContent = totalHouseholds ? ((totalMembers / totalHouseholds).toFixed(2) + ' thành viên/hộ') : '—';
}

function renderHouseholdsTable() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = households.filter(h => {
    if (q) {
      const hay = `${h.so_ho_khau} ${h.ten_chu_ho} ${h.dia_chi}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  householdsTbody.innerHTML = '';
  
  if (filtered.length === 0) {
    householdsTbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
    return;
  }

  filtered.forEach((h) => {
    const tr = document.createElement('tr');
    const membersCount = h.so_thanh_vien || 0;
    tr.innerHTML = `
      <td><span class="household-code">${escapeHtml(h.ho_khau_id)}</span></td>
      <td>${escapeHtml(h.so_ho_khau)}</td>
      <td>${escapeHtml(h.ten_chu_ho)}</td>
      <td style="min-width:260px">${escapeHtml(h.dia_chi || '')}</td>
      <td><span class="badge bg-secondary count-badge">${membersCount}</span></td>
      <td>
        <button class="btn btn-sm btn-primary me-1" title="Xem chi tiết" onclick="viewHousehold(${h.ho_khau_id})"><i class="fa-regular fa-eye"></i></button>
        <button class="btn btn-sm btn-outline-secondary me-1" title="Sửa" onclick="openEditHousehold(${h.ho_khau_id})"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Xóa" onclick="deleteHousehold(${h.ho_khau_id})"><i class="fa-regular fa-trash-can"></i></button>
      </td>
    `;
    householdsTbody.appendChild(tr);
  });
}

// ========== CHECK CCCD - TỰ ĐỘNG ĐIỀN THÔNG TIN ==========
document.getElementById('btnCheckCCCD').addEventListener('click', async () => {
  const cccd = document.getElementById('chu_ho_cccd').value.trim();
  if (!cccd) {
    showAlert('Vui lòng nhập CCCD trước', 'warning');
    return;
  }

  try {
    showLoading();
    const res = await fetch(`${API_BASE}/persons/${cccd}`);
    
    if (res.ok) {
      const person = await res.json();
      document.getElementById('ho_ten').value = person.name || '';
      document.getElementById('gioi_tinh').value = person.gioiTinh || 'Nam';
      document.getElementById('ngay_sinh').value = person.ngaySinh || '';
      document.getElementById('dan_toc').value = person.danToc || 'Kinh';
      document.getElementById('ton_giao').value = person.tonGiao || 'Không';
      document.getElementById('quoc_tich').value = person.quocTich || 'Việt Nam';
      
      showAlert('Đã tìm thấy thông tin! Vui lòng kiểm tra và bổ sung địa chỉ.', 'success');
    } else {
      showAlert('CCCD chưa tồn tại trong hệ thống. Vui lòng nhập đầy đủ thông tin để tạo mới.', 'info');
    }
  } catch (err) {
    console.error(err);
    showAlert('Lỗi khi kiểm tra CCCD', 'danger');
  } finally {
    hideLoading();
  }
});

// ========== THÊM/SỬA HỘ KHẨU ==========
document.getElementById('householdForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editingId = document.getElementById('editingHouseholdId').value;
  const so_ho_khau = document.getElementById('so_ho_khau').value.trim();
  const chu_ho_cccd = document.getElementById('chu_ho_cccd').value.trim();
  const ho_ten = document.getElementById('ho_ten').value.trim();
  const gioi_tinh = document.getElementById('gioi_tinh').value;
  const ngay_sinh = document.getElementById('ngay_sinh').value;
  const dan_toc = document.getElementById('dan_toc').value.trim();
  const ton_giao = document.getElementById('ton_giao').value.trim();
  const quoc_tich = document.getElementById('quoc_tich').value.trim();
  
  const so_nha = document.getElementById('so_nha').value.trim();
  const duong_pho = document.getElementById('duong_pho').value.trim();
  const phuong_xa = document.getElementById('phuong_xa').value.trim();
  const quan_huyen = document.getElementById('quan_huyen').value.trim();
  
  const dia_chi = [so_nha, duong_pho, phuong_xa, quan_huyen].filter(x => x).join(', ');

  if (!so_ho_khau || !chu_ho_cccd || !ho_ten || !ngay_sinh) {
    showAlert('Vui lòng điền đầy đủ các trường bắt buộc');
    return;
  }

  try {
    showLoading();
    
    // Bước 1: Kiểm tra person có tồn tại không
    const checkPerson = await fetch(`${API_BASE}/persons/${chu_ho_cccd}`);
    
    if (!checkPerson.ok) {
      // Tạo person mới
      const personData = {
        cccd: chu_ho_cccd,
        name: ho_ten,
        ngaySinh: ngay_sinh,
        gioiTinh: gioi_tinh,
        danToc: dan_toc,
        tonGiao: ton_giao,
        quocTich: quoc_tich,
        diaChi: dia_chi,
        tinhTrangCuTru: 'Thường trú',
        quanHe: 'Chủ hộ',
        ngayDangKy: new Date().toISOString().split('T')[0]
      };
      
      const createPerson = await fetch(`${API_BASE}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personData)
      });
      
      if (!createPerson.ok) {
        const err = await createPerson.json();
        throw new Error(err.error || 'Không thể tạo thông tin chủ hộ');
      }
    }

    // Bước 2: Tạo hoặc cập nhật household
    const householdData = {
      so_ho_khau,
      chu_ho_cccd,
      dia_chi,
      so_nha,
      duong_pho,
      phuong_xa,
      quan_huyen
    };

    let response;
    if (editingId) {
      // Sửa
      response = await fetch(`${API_BASE}/household/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(householdData)
      });
    } else {
      // Thêm mới
      response = await fetch(`${API_BASE}/household`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(householdData)
      });
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Lỗi khi lưu hộ khẩu');
    }

    alert(editingId ? 'Cập nhật hộ khẩu thành công!' : 'Thêm hộ khẩu thành công!');
    householdAddModal.hide();
    document.getElementById('householdForm').reset();
    document.getElementById('editingHouseholdId').value = '';
    await loadHouseholds();

  } catch (err) {
    console.error(err);
    showAlert(err.message || 'Có lỗi xảy ra');
  } finally {
    hideLoading();
  }
});

// ========== MỞ FORM SỬA HỘ KHẨU ==========
async function openEditHousehold(householdId) {
  try {
    showLoading();
    const res = await fetch(`${API_BASE}/household/${householdId}`);
    if (!res.ok) throw new Error('Không tải được thông tin hộ khẩu');
    
    const household = await res.json();
    
    document.getElementById('editingHouseholdId').value = household.ho_khau_id;
    document.getElementById('so_ho_khau').value = household.so_ho_khau || '';
    document.getElementById('chu_ho_cccd').value = household.chu_ho_cccd || '';
    document.getElementById('ho_ten').value = household.ten_chu_ho || '';
    document.getElementById('gioi_tinh').value = household.chu_ho_gioi_tinh || 'Nam';
    document.getElementById('ngay_sinh').value = household.chu_ho_ngay_sinh || '';
    
    document.getElementById('so_nha').value = household.so_nha || '';
    document.getElementById('duong_pho').value = household.duong_pho || '';
    document.getElementById('phuong_xa').value = household.phuong_xa || '';
    document.getElementById('quan_huyen').value = household.quan_huyen || '';
    
    document.getElementById('householdFormTitle').textContent = 'Sửa Hộ khẩu';
    householdAddModal.show();
    
  } catch (err) {
    console.error(err);
    alert('Không thể tải thông tin hộ khẩu');
  } finally {
    hideLoading();
  }
}

// ========== XÓA HỘ KHẨU ==========
async function deleteHousehold(householdId) {
  if (!confirm('Bạn có chắc muốn xóa Hộ khẩu này? Toàn bộ thành viên sẽ bị xóa khỏi danh sách.')) return;
  
  try {
    showLoading();
    const res = await fetch(`${API_BASE}/household/${householdId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa hộ khẩu');
    
    alert('Xóa hộ khẩu thành công!');
    await loadHouseholds();
  } catch (err) {
    console.error(err);
    alert('Có lỗi xảy ra khi xóa hộ khẩu');
  } finally {
    hideLoading();
  }
}

// ========== XEM CHI TIẾT HỘ KHẨU ==========
async function viewHousehold(householdId) {
  currentDetailHouseholdId = householdId;
  
  try {
    showLoading();
    const res = await fetch(`${API_BASE}/household/${householdId}`);
    if (!res.ok) throw new Error('Không tải được thông tin hộ khẩu');
    
    const household = await res.json();
    
    document.getElementById('detailSoHoKhau').textContent = household.so_ho_khau || '—';
    document.getElementById('detailHeadName').textContent = household.ten_chu_ho || '—';
    document.getElementById('detailAddress').textContent = household.dia_chi || '—';
    
    document.getElementById('addMemberContainer').classList.add('d-none');
    document.getElementById('addMemberForm').reset();
    document.getElementById('addMemberAlert').classList.add('d-none');
    
    renderMembersTable(household.members || []);
    householdDetailModal.show();
    
  } catch (err) {
    console.error(err);
    alert('Không thể tải chi tiết hộ khẩu');
  } finally {
    hideLoading();
  }
}

function renderMembersTable(members) {
  membersTbody.innerHTML = '';
  
  if (members.length === 0) {
    membersTbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có thành viên</td></tr>';
    return;
  }

  members.forEach((m) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(m.cccd)}</td>
      <td>${escapeHtml(m.ho_ten)}</td>
      <td>${m.ngay_sinh ? formatDate(m.ngay_sinh) : ''}</td>
      <td>${escapeHtml(m.gioi_tinh || '')}</td>
      <td>${escapeHtml(m.quan_he || '')}</td>
      <td>${escapeHtml(m.dan_toc || '')}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" title="Xóa thành viên" onclick="deleteMember('${m.cccd}')"><i class="fa-regular fa-trash-can"></i></button>
      </td>
    `;
    membersTbody.appendChild(tr);
  });
}

// ========== SEARCH & FILTERS ==========
document.getElementById('searchInput').addEventListener('input', renderHouseholdsTable);
document.getElementById('clearSearchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  renderHouseholdsTable();
});

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  loadHouseholds();
  const username = localStorage.getItem('username') || 'admin';
  document.getElementById('usernameDisplay').textContent = username;
});

// Reset form khi đóng modal
householdAddModalEl.addEventListener('hidden.bs.modal', () => {
  document.getElementById('householdForm').reset();
  document.getElementById('editingHouseholdId').value = '';
  document.getElementById('householdFormTitle').textContent = 'Thêm Hộ khẩu mới';
  document.getElementById('formAlertHousehold').classList.add('d-none');
});

// Expose functions to global scope
window.viewHousehold = viewHousehold;
window.openEditHousehold = openEditHousehold;
window.deleteHousehold = deleteHousehold;
window.goTo = goTo;
window.logout = logout;