document.addEventListener('DOMContentLoaded', () => {
  renderLinhVuc();
  renderJobs(getAllPortalJobs().slice(0, 6));
  renderStats();
});

function renderLinhVuc() {
  const list = document.getElementById('linh-vuc-list');
  if (!list) return;
  list.innerHTML = LINH_VUC.slice(0, 6).map(lv => `
    <li>
      <a href="pages/viec-lam.html?linhvuc=${lv.MaLinhVuc}">
        ${lv.TenLinhVuc}
        <i class="fas fa-chevron-right"></i>
      </a>
    </li>
  `).join('');
}

function renderJobs(jobs) {
  const container = document.getElementById('job-list');
  if (!container) return;
  container.innerHTML = jobs.map(renderJobCard).join('');
}

function renderStats() {
  document.getElementById('stat-sv').textContent  = THONG_KE.TongSinhVien.toLocaleString('vi-VN');
  document.getElementById('stat-dn').textContent  = THONG_KE.TongDoanhNghiep.toLocaleString('vi-VN');
  document.getElementById('stat-tin').textContent = THONG_KE.TinDangTuyen.toLocaleString('vi-VN');
  document.getElementById('stat-dat').textContent = THONG_KE.SinhVienDaCoNoiThucTap.toLocaleString('vi-VN');
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const type = tab.dataset.tab;
    let jobs = getAllPortalJobs();
    if (type === 'moi-nhat') {
      jobs.sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao));
    } else if (type === 'luong-cao') {
      jobs = jobs.filter(j => j.CoLuong);
    }
    renderJobs(jobs.slice(0, 6));
  });
});

document.querySelectorAll('.filter-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const text = chip.textContent.trim();
    let jobs = getAllPortalJobs();
    if (text !== 'Tất cả') {
      if (text === 'Remote') {
        jobs = jobs.filter(j => j.HinhThucLamViec === 'TU_XA');
      } else {
        jobs = jobs.filter(j => j.TenTinhThanh.includes(text.replace('TP. ', '')));
      }
    }
    renderJobs(jobs.slice(0, 6));
  });
});