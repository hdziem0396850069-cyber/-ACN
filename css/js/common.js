/**
 * Hàm dùng chung toàn hệ thống
 */

const TRANG_THAI_DON = {
  DA_NOP:     { label: 'Đã nộp',     cls: 'da-nop' },
  DA_XEM:     { label: 'Đã xem',     cls: 'da-xem' },
  PHONG_VAN:  { label: 'Phỏng vấn',  cls: 'phong-van' },
  DAT:        { label: 'Đạt',        cls: 'dat' },
  KHONG_DAT:  { label: 'Không đạt',  cls: 'khong-dat' },
  DA_RUT:     { label: 'Đã rút',     cls: 'da-rut' }
};

const HINH_THUC = {
  TAI_CHO:  'Tại chỗ',
  TU_XA:    'Từ xa',
  KET_HOP:  'Kết hợp'
};

const PORTAL_KEYS = {
  savedJobs: 'hutech.savedJobs',
  applications: 'hutech.applications',
  notifications: 'hutech.notifications',
  jobs: 'hutech.jobs',
  profile: 'hutech.profile',
  cvs: 'hutech.cvs',
  messages: 'hutech.messages',
  users: 'hutech.users'
};

function readPortalValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writePortalValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function getSavedJobIds() {
  return readPortalValue(PORTAL_KEYS.savedJobs, []);
}

function getAllPortalJobs() {
  const customJobs = readPortalValue(PORTAL_KEYS.jobs, []);
  return [...TIN_TUYEN_DUNG, ...customJobs.filter(job => job.TrangThai === 'DANG_TUYEN' && !TIN_TUYEN_DUNG.some(seed => seed.MaTin === job.MaTin))];
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('vi-VN');
}

function daysLeft(hanNop) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = new Date(hanNop);
  const diff = Math.ceil((end - today) / 86400000);
  if (diff < 0) return 'Đã hết hạn';
  if (diff === 0) return 'Hết hạn hôm nay';
  return `Còn ${diff} ngày`;
}

function renderJobCard(job) {
  const isSaved = getSavedJobIds().includes(job.MaTin);
  const salary = job.CoLuong
    ? `<span class="salary"><i class="fas fa-money-bill-wave"></i> ${escapeHTML(job.MucHoTro)}</span>`
    : `<span><i class="fas fa-hand-holding-heart"></i> Không lương</span>`;

  const base = location.pathname.includes('/pages/') ? '' : 'pages/';

  return `
    <article class="job-card" data-id="${Number(job.MaTin)}">
      ${job.LuotXem > 1000 ? '<span class="badge-hot">HOT</span>' : ''}
      <div class="job-card-header">
        <img src="${escapeHTML(job.LinkLogo)}" alt="${escapeHTML(job.TenDoanhNghiep)}" class="job-logo">
        <div>
          <a href="${base}chi-tiet-tin.html?id=${Number(job.MaTin)}" class="job-title">${escapeHTML(job.TieuDe)}</a>
          <div class="job-company">${escapeHTML(job.TenDoanhNghiep)}</div>
        </div>
      </div>
      <div class="job-meta">
        ${salary}
        <span><i class="fas fa-map-marker-alt"></i> ${escapeHTML(job.TenTinhThanh)}</span>
        <span><i class="fas fa-clock"></i> ${escapeHTML(job.ThoiGianThang || '?')} tháng</span>
        <span><i class="fas fa-laptop-house"></i> ${escapeHTML(HINH_THUC[job.HinhThucLamViec] || job.HinhThucLamViec)}</span>
      </div>
      <div class="job-footer">
        <span class="time"><i class="far fa-calendar"></i> ${escapeHTML(daysLeft(job.HanNop))}</span>
        <button class="btn-save ${isSaved ? 'saved' : ''}" title="Lưu tin" aria-label="Lưu tin" aria-pressed="${isSaved}" onclick="toggleSave(this, ${Number(job.MaTin)})">
          <i class="${isSaved ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
    </article>
  `;
}

function toggleSave(btn, maTin) {
  const saved = getSavedJobIds();
  const isSaved = saved.includes(maTin);
  writePortalValue(PORTAL_KEYS.savedJobs, isSaved ? saved.filter(id => id !== maTin) : [...saved, maTin]);
  btn.classList.toggle('saved', !isSaved);
  btn.setAttribute('aria-pressed', String(!isSaved));
  btn.title = isSaved ? 'Lưu tin' : 'Bỏ lưu tin';
  btn.setAttribute('aria-label', btn.title);
  const label = btn.querySelector('[data-save-label]');
  if (label) label.textContent = isSaved ? 'Lưu tin' : 'Đã lưu';
  const icon = btn.querySelector('i');
  if (!isSaved) {
    icon.classList.replace('far', 'fas');
  } else {
    icon.classList.replace('fas', 'far');
  }
}

function renderStatusBadge(trangThai) {
  const info = TRANG_THAI_DON[trangThai] || { label: trangThai, cls: '' };
  return `<span class="badge-status ${escapeHTML(info.cls)}">${escapeHTML(info.label)}</span>`;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}