(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const read = (key, fallback) => readPortalValue(key, fallback);
  const write = (key, value) => writePortalValue(key, value);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function jobs() {
    const custom = read(PORTAL_KEYS.jobs, []);
    return [...TIN_TUYEN_DUNG, ...custom.filter(job => !TIN_TUYEN_DUNG.some(seed => seed.MaTin === job.MaTin))];
  }

  function toast(message, type = 'success') {
    $('.portal-toast')?.remove();
    const item = document.createElement('div');
    item.className = `portal-toast ${type}`;
    item.setAttribute('role', 'status');
    item.textContent = message;
    document.body.append(item);
    setTimeout(() => item.remove(), 2800);
  }

  function openForm(title, fields, onSubmit) {
    $('.portal-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'portal-modal';
    const fieldMarkup = fields.map(field => {
      const value = escapeHtml(field.value || '');
      const required = field.required === false ? '' : 'required';
      let control;
      if (field.type === 'textarea') {
        control = `<textarea class="form-control" name="${escapeHtml(field.name)}" rows="4" ${required}>${value}</textarea>`;
      } else if (field.type === 'select') {
        control = `<select class="form-control" name="${escapeHtml(field.name)}" ${required}>${field.options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
      } else {
        control = `<input class="form-control" name="${escapeHtml(field.name)}" type="${field.type || 'text'}" value="${value}" ${required}>`;
      }
      return `<label class="portal-field"><span>${escapeHtml(field.label)}</span>${control}</label>`;
    }).join('');
    overlay.innerHTML = `
      <form class="portal-dialog">
        <button class="portal-close" type="button" aria-label="Đóng">&times;</button>
        <h2>${escapeHtml(title)}</h2>
        <div class="portal-fields">${fieldMarkup}</div>
        <div class="portal-dialog-actions">
          <button class="btn btn-outline" type="button" data-cancel>Hủy</button>
          <button class="btn btn-primary" type="submit">Lưu</button>
        </div>
      </form>`;
    document.body.append(overlay);
    const close = () => overlay.remove();
    $('.portal-close', overlay).addEventListener('click', close);
    $('[data-cancel]', overlay).addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    $('.portal-dialog', overlay).addEventListener('submit', event => {
      event.preventDefault();
      onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      close();
    });
    $('input, textarea, select', overlay)?.focus();
  }

  function addNotification(title, message, type = 'DON_MOI') {
    const items = read(PORTAL_KEYS.notifications, THONG_BAO);
    items.unshift({
      MaThongBao: Date.now(), Loai: type, TieuDe: title, NoiDung: message,
      DaDoc: false, NgayTao: new Date().toLocaleString('vi-VN')
    });
    write(PORTAL_KEYS.notifications, items);
  }

  function showInfo(title, details) {
    $('.portal-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'portal-modal';
    overlay.innerHTML = `<section class="portal-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <button class="portal-close" type="button" aria-label="Đóng">&times;</button>
      <h2>${escapeHtml(title)}</h2>
      <div class="portal-fields">${details.map(detail => `<p><strong>${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}</p>`).join('')}</div>
      <div class="portal-dialog-actions"><button class="btn btn-primary" type="button" data-close>Đóng</button></div>
    </section>`;
    document.body.append(overlay);
    const close = () => overlay.remove();
    $('.portal-close', overlay).addEventListener('click', close);
    $('[data-close]', overlay).addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  }

  function renderSavedJobs() {
    const container = $('#saved-list');
    if (!container) return;
    const ids = getSavedJobIds();
    const savedJobs = jobs().filter(job => ids.includes(job.MaTin));
    container.innerHTML = savedJobs.length
      ? savedJobs.map(renderJobCard).join('')
      : '<div class="empty-state"><i class="far fa-heart"></i><h3>Bạn chưa lưu tin nào</h3><p>Nhấn biểu tượng trái tim ở tin tuyển dụng để lưu lại.</p><a class="btn btn-primary" href="viec-lam.html">Khám phá việc làm</a></div>';
    container.onclick = event => {
      if (event.target.closest('.btn-save')) setTimeout(renderSavedJobs, 0);
    };
  }

  function renderApplications(status = 'ALL') {
    const container = $('#don-list');
    if (!container) return;
    let applications = read(PORTAL_KEYS.applications, DON_UNG_TUYEN);
    if (status !== 'ALL') applications = applications.filter(item => item.TrangThai === status);
    container.innerHTML = applications.length ? applications.map(item => `
      <article class="don-card">
        <div class="don-left"><h3>${escapeHtml(item.TieuDe)}</h3>
          <p class="company"><i class="fas fa-building"></i> ${escapeHtml(item.TenDoanhNghiep)}</p>
          <p class="time"><i class="far fa-clock"></i> Nộp ngày ${formatDate(item.NgayNop)}</p>
        </div>
        <div class="don-right">${renderStatusBadge(item.TrangThai)}
          ${item.Diem != null ? `<span class="diem">Điểm: ${escapeHtml(item.Diem)}/100</span>` : ''}
          <button class="btn btn-outline" data-app-detail="${item.MaDon}">Chi tiết</button>
          ${item.TrangThai === 'DA_NOP' ? `<button class="btn btn-outline" data-app-withdraw="${item.MaDon}">Rút đơn</button>` : ''}
        </div>
      </article>`).join('') : '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Chưa có đơn nào</h3><a class="btn btn-primary" href="viec-lam.html">Tìm việc ngay</a></div>';
  }

  function initApplications() {
    if (!$('#don-list')) return;
    renderApplications();
    $$('.tabs [data-status]').forEach(tab => tab.addEventListener('click', () => {
      $$('.tabs [data-status]').forEach(item => item.classList.toggle('active', item === tab));
      renderApplications(tab.dataset.status);
    }));
    $('#don-list').addEventListener('click', event => {
      const detail = event.target.closest('[data-app-detail]');
      const withdraw = event.target.closest('[data-app-withdraw]');
      const applications = read(PORTAL_KEYS.applications, DON_UNG_TUYEN);
      if (detail) {
        const item = applications.find(app => String(app.MaDon) === detail.dataset.appDetail);
        if (item) showInfo('Chi tiết đơn ứng tuyển', [
          { label: 'Vị trí', value: item.TieuDe },
          { label: 'Doanh nghiệp', value: item.TenDoanhNghiep },
          { label: 'Ngày nộp', value: formatDate(item.NgayNop) },
          { label: 'Trạng thái', value: TRANG_THAI_DON[item.TrangThai]?.label || item.TrangThai },
          { label: 'CV', value: item.CV || 'CV trong hồ sơ' },
          { label: 'Lời nhắn', value: item.LoiNhan || 'Không có' }
        ]);
      }
      if (withdraw && confirm('Bạn muốn rút đơn ứng tuyển này?')) {
        const updated = applications.map(app => String(app.MaDon) === withdraw.dataset.appWithdraw ? { ...app, TrangThai: 'DA_RUT' } : app);
        write(PORTAL_KEYS.applications, updated);
        renderApplications($('.tabs [data-status].active')?.dataset.status || 'ALL');
        toast('Đã rút đơn ứng tuyển.');
      }
    });
  }

  function initJobApplication() {
    const button = $('#applyJobBtn');
    if (!button) return;
    button.addEventListener('click', () => {
      const job = jobs().find(item => item.MaTin === Number(button.dataset.jobId));
      if (!job) return;
      const applications = read(PORTAL_KEYS.applications, DON_UNG_TUYEN);
      if (applications.some(item => item.MaTin === job.MaTin && item.TrangThai !== 'DA_RUT')) {
        toast('Bạn đã ứng tuyển công việc này rồi.', 'info');
        return;
      }
      const cvs = read(PORTAL_KEYS.cvs, [
        { id: 1, name: 'CV Frontend Developer', type: 'PDF', default: true },
        { id: 2, name: 'CV Online - Fullstack', type: 'ONLINE', default: false }
      ]);
      openForm('Ứng tuyển: ' + job.TieuDe, [
        { name: 'cv', label: 'CV đính kèm', type: 'select', options: cvs.map(cv => ({ value: cv.name, label: cv.name })) },
        { name: 'letter', label: 'Lời nhắn cho nhà tuyển dụng', type: 'textarea', required: false }
      ], values => {
        applications.unshift({
          MaDon: Date.now(), MaTin: job.MaTin, TieuDe: job.TieuDe,
          TenDoanhNghiep: job.TenDoanhNghiep, TrangThai: 'DA_NOP',
          NgayNop: new Date().toISOString().slice(0, 10), Diem: null,
          CV: values.cv, LoiNhan: values.letter
        });
        write(PORTAL_KEYS.applications, applications);
        addNotification('Ứng tuyển thành công', `Đơn ứng tuyển ${job.TieuDe} đã được gửi.`);
        toast('Đã gửi đơn ứng tuyển thành công.');
      });
    });
  }

  function initPosting() {
    const form = $('.form-card');
    if (!form || !location.pathname.endsWith('/dang-tin.html')) return;
    const inputs = $$('input, textarea', form);
    if (inputs.length < 5) return;
    inputs[0].required = true;
    inputs[0].name = 'title';
    inputs[1].required = true;
    inputs[1].name = 'location';
    inputs[2].required = true;
    inputs[2].name = 'industry';
    inputs[3].required = true;
    inputs[3].name = 'companyName';
    inputs[4].required = true;
    inputs[4].name = 'description';
    const submit = $('button', form);
    submit.type = 'submit';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const all = jobs();
      const locationItem = TINH_THANH.find(item => values.location.toLowerCase().includes(item.TenTinhThanh.toLowerCase())) || TINH_THANH[0];
      const industry = LINH_VUC.find(item => values.industry.toLowerCase().includes(item.TenLinhVuc.toLowerCase())) || LINH_VUC[0];
      const custom = read(PORTAL_KEYS.jobs, []);
      const id = Math.max(0, ...all.map(item => item.MaTin)) + 1;
      custom.unshift({
        MaTin: id, TieuDe: values.title, MaDoanhNghiep: 99,
        TenDoanhNghiep: values.companyName,
        LinkLogo: 'https://ui-avatars.com/api/?name=DN&background=00b14f&color=fff',
        MaLinhVuc: industry.MaLinhVuc, TenLinhVuc: industry.TenLinhVuc,
        MaTinhThanh: locationItem.MaTinhThanh, TenTinhThanh: values.location,
        HinhThucLamViec: 'TAI_CHO', ThoiGianThang: 3, CoLuong: true,
        MucHoTro: 'Thỏa thuận', SoLuong: 1, HanNop: '2027-12-31',
        TrangThai: 'CHO_DUYET', LuotXem: 0, NgayTao: new Date().toISOString().slice(0, 10),
        KyNang: [], MoTa: values.description
      });
      write(PORTAL_KEYS.jobs, custom);
      write('hutech.companyName', values.companyName);
      addNotification('Tin tuyển dụng đã được gửi duyệt', values.title);
      toast('Đã đăng tin. Tin đang chờ quản trị viên duyệt.');
      setTimeout(() => { window.location.href = 'doanh-nghiep.html'; }, 900);
    });
  }

  function initEmployerDashboard() {
    if (!location.pathname.endsWith('/doanh-nghiep.html')) return;
    const body = $('.table tbody');
    if (!body) return;
    const currentJobs = jobs();
    const applications = read(PORTAL_KEYS.applications, DON_UNG_TUYEN);
    body.innerHTML = currentJobs.map(job => {
      const count = applications.filter(app => app.MaTin === job.MaTin).length;
      return `<tr><td><strong>${escapeHtml(job.TieuDe)}</strong></td>
        <td>${job.TrangThai === 'CHO_DUYET' ? '<span class="badge-status cho-duyet">Chờ duyệt</span>' : '<span class="badge-status dang-tuyen">Đang tuyển</span>'}</td>
        <td>${count}</td><td>${formatDate(job.HanNop)}</td><td>${job.LuotXem || 0}</td>
        <td><button class="link-more" data-manage-job="${job.MaTin}">Quản lý</button></td></tr>`;
    }).join('');
    const stats = $$('.stats-grid .stat-card strong');
    if (stats[0]) stats[0].textContent = currentJobs.length;
    if (stats[1]) stats[1].textContent = applications.length;
    if (stats[2]) stats[2].textContent = applications.filter(app => app.TrangThai === 'PHONG_VAN').length;
    if (stats[3]) stats[3].textContent = applications.filter(app => app.TrangThai === 'DAT').length;
    $('.page-header + .container button.btn-primary')?.addEventListener('click', () => { window.location.href = 'dang-tin.html'; });
    body.addEventListener('click', event => {
      const button = event.target.closest('[data-manage-job]');
      if (!button) return;
      const related = applications.filter(app => app.MaTin === Number(button.dataset.manageJob));
      if (!related.length) {
        toast('Tin này chưa có ứng viên.', 'info');
        return;
      }
      const selected = related[0];
      openForm('Cập nhật ứng viên', [
        { name: 'applicationId', label: 'Ứng viên / đơn', type: 'select', value: selected.MaDon, options: related.map(app => ({ value: app.MaDon, label: `${app.TieuDe} - ${TRANG_THAI_DON[app.TrangThai]?.label || app.TrangThai}` })) },
        { name: 'status', label: 'Trạng thái mới', type: 'select', value: selected.TrangThai, options: Object.entries(TRANG_THAI_DON).map(([value, info]) => ({ value, label: info.label })) }
      ], values => {
        const updated = applications.map(app => String(app.MaDon) === values.applicationId ? { ...app, TrangThai: values.status } : app);
        write(PORTAL_KEYS.applications, updated);
        addNotification('Trạng thái đơn ứng tuyển đã thay đổi', selected.TieuDe, 'DOI_TRANG_THAI');
        toast('Đã cập nhật trạng thái ứng viên.');
        initEmployerDashboard();
      });
    });
  }

  function initAdminDashboard() {
    if (!location.pathname.endsWith('/admin.html')) return;
    const body = $('.data-table tbody');
    if (!body) return;
    const customJobs = read(PORTAL_KEYS.jobs, []);
    const applications = read(PORTAL_KEYS.applications, DON_UNG_TUYEN);
    const users = read(PORTAL_KEYS.users, []);
    const counts = {
      students: users.filter(user => user.role === 'student').length,
      companies: DOANH_NGHIEP.length + users.filter(user => user.role === 'employer').length,
      jobs: getAllPortalJobs().length,
      applications: applications.length
    };
    Object.entries(counts).forEach(([key, value]) => {
      const element = $(`[data-admin-stat="${key}"]`);
      if (element) element.textContent = value.toLocaleString('vi-VN');
    });
    const pending = customJobs.filter(job => job.TrangThai === 'CHO_DUYET');
    body.innerHTML = pending.length ? pending.map(job => `<tr>
      <td>Tin tuyển dụng</td><td>${escapeHtml(job.TieuDe)} · ${escapeHtml(job.TenDoanhNghiep)}</td>
      <td><span class="badge-status cho-duyet">Chờ duyệt</span></td>
      <td><button class="btn btn-primary" data-admin-approve="${job.MaTin}">Duyệt</button>
        <button class="btn btn-outline" data-admin-reject="${job.MaTin}">Từ chối</button></td></tr>`).join('') :
      '<tr><td colspan="4">Không có tin tuyển dụng chờ duyệt.</td></tr>';
    body.onclick = event => {
      const approve = event.target.closest('[data-admin-approve]');
      const reject = event.target.closest('[data-admin-reject]');
      const action = approve || reject;
      if (!action) return;
      const status = approve ? 'DANG_TUYEN' : 'TU_CHOI';
      const updated = customJobs.map(job => String(job.MaTin) === action.dataset.adminApprove || String(job.MaTin) === action.dataset.adminReject ? { ...job, TrangThai: status } : job);
      write(PORTAL_KEYS.jobs, updated);
      addNotification(approve ? 'Tin tuyển dụng đã được duyệt' : 'Tin tuyển dụng bị từ chối', action.closest('tr').children[1].textContent);
      toast(approve ? 'Đã duyệt tin tuyển dụng.' : 'Đã từ chối tin tuyển dụng.');
      initAdminDashboard();
    };
  }

  function initCompanyDirectory() {
    const container = $('#company-list');
    if (!container) return;
    const customJobs = read(PORTAL_KEYS.jobs, []).filter(job => job.TrangThai === 'DANG_TUYEN');
    const companies = [...new Map(customJobs.map(job => [job.MaDoanhNghiep, job])).values()];
    companies.forEach(job => {
      const card = document.createElement('article');
      card.className = 'company-card';
      card.innerHTML = `<img src="${escapeHtml(job.LinkLogo)}" class="company-logo" alt="">
        <h3>${escapeHtml(job.TenDoanhNghiep)}</h3><p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.TenTinhThanh)}</p>
        <p class="so-tin">${customJobs.filter(item => item.MaDoanhNghiep === job.MaDoanhNghiep).length} tin đang tuyển</p>
        <a href="viec-lam.html?company=${job.MaDoanhNghiep}" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:12px;">Xem việc làm</a>`;
      container.append(card);
    });
  }

  function initProfile() {
    const grid = $('.profile-grid');
    if (!grid) return;
    const cards = $$('.profile-card', grid);
    const renderItems = (list, items) => {
      if (list.classList.contains('skill-tags')) {
        list.innerHTML = items.map(line => `<span class="skill-tag">${escapeHtml(line)}</span>`).join('');
      } else if (list.classList.contains('project-list')) {
        list.innerHTML = items.map(line => `<div class="project-item"><h4>${escapeHtml(line)}</h4></div>`).join('');
      } else {
        list.innerHTML = items.map(line => `<li>${escapeHtml(line)}</li>`).join('');
      }
    };
    cards.forEach(card => {
      const heading = $('.card-header h3', card)?.textContent.replace(/^[^\p{L}]*/u, '').trim();
      const button = $('.btn-sm-edit', card);
      if (!button) return;
      button.addEventListener('click', () => {
        if (heading === 'Thông tin cá nhân' || heading === 'Nguyện vọng thực tập') {
          const rows = $$('.info-row', card);
          const fields = rows.map((row, index) => ({
            name: `field${index}`, label: $('span', row)?.textContent || `Thông tin ${index + 1}`,
            value: $('strong', row)?.textContent.trim() || ''
          }));
          if (heading === 'Thông tin cá nhân') {
            fields.unshift({ name: 'fullName', label: 'Họ và tên', value: $('.profile-avatar-row h2', card)?.textContent || '' });
            fields.splice(1, 0, {
              name: 'email', label: 'Email',
              value: $('.profile-avatar-row .email', card)?.textContent.trim().split(/\s+/).pop() || ''
            });
          }
          openForm('Chỉnh sửa ' + heading.toLowerCase(), fields, values => {
            const name = values.fullName;
            if (name) $('.profile-avatar-row h2', card).textContent = name;
            if (values.email) $('.profile-avatar-row .email', card).innerHTML = `<i class="fas fa-envelope"></i> ${escapeHtml(values.email)}`;
            rows.forEach((row, index) => { $('strong', row).textContent = values[`field${index}`]; });
            const state = read(PORTAL_KEYS.profile, {});
            state[heading] = values;
            write(PORTAL_KEYS.profile, state);
            toast('Đã lưu hồ sơ.');
          });
          return;
        }
        const list = $('.skill-tags, .project-list, .simple-list', card);
        const original = list ? [...list.children].map(item => item.innerText.replace(/\s+/g, ' ').trim()).join('\n') : '';
        openForm('Cập nhật ' + (heading || 'thông tin'), [{
          name: 'items', label: 'Mỗi nội dung một dòng', type: 'textarea', value: original, required: false
        }], values => {
          const lines = values.items.split('\n').map(line => line.trim()).filter(Boolean);
          if (list) renderItems(list, lines);
          const state = read(PORTAL_KEYS.profile, {});
          state[heading || 'other'] = lines;
          write(PORTAL_KEYS.profile, state);
          toast('Đã cập nhật hồ sơ.');
        });
      });
    });
    const state = read(PORTAL_KEYS.profile, null);
    if (state) {
      cards.forEach(card => {
        const heading = $('.card-header h3', card)?.textContent.replace(/^[^\p{L}]*/u, '').trim();
        const saved = state[heading];
        if (!saved) return;
        if (heading === 'Thông tin cá nhân' || heading === 'Nguyện vọng thực tập') {
          $$('.info-row', card).forEach((row, index) => {
            if (saved[`field${index}`]) $('strong', row).textContent = saved[`field${index}`];
          });
          if (saved.fullName) $('.profile-avatar-row h2', card).textContent = saved.fullName;
          if (saved.email) $('.profile-avatar-row .email', card).innerHTML = `<i class="fas fa-envelope"></i> ${escapeHtml(saved.email)}`;
        } else if (Array.isArray(saved)) {
          const list = $('.skill-tags, .project-list, .simple-list', card);
          if (list) renderItems(list, saved);
        }
      });
    }
  }

  function initCVs() {
    const grid = $('.cv-grid');
    if (!grid) return;
    const initial = [
      { id: 1, name: 'CV Frontend Developer', type: 'PDF', date: '05/10/2026', default: true, data: '' },
      { id: 2, name: 'CV Online - Fullstack', type: 'ONLINE', date: '01/09/2026', default: false, data: '' }
    ];
    let cvs = read(PORTAL_KEYS.cvs, initial);
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.pdf,.doc,.docx';
    upload.hidden = true;
    document.body.append(upload);
    const renderSampleCV = cv => {
      const isOnline = cv.type === 'ONLINE';
      const role = /frontend/i.test(cv.name) ? 'Frontend Developer' : 'Fullstack Developer';
      const skills = isOnline
        ? 'JavaScript · ReactJS · Node.js · SQL · Git'
        : 'HTML · CSS · JavaScript · ReactJS · Git';
      return `<article class="cv-preview-page">
        <header class="cv-preview-header">
          <div><h1>Nguyễn Văn A</h1><p>${role} · Sinh viên Công nghệ thông tin</p></div>
          <span>CV MẪU</span>
        </header>
        <section><h2>Thông tin liên hệ</h2><p>Email: nguyenvana@example.com · Điện thoại: 0900 000 000</p><p>TP. Hồ Chí Minh · github.com/nguyenvana</p></section>
        <section><h2>Mục tiêu nghề nghiệp</h2><p>Mong muốn phát triển kỹ năng ${role} thông qua các dự án thực tế, đồng thời đóng góp vào sản phẩm và học hỏi trong môi trường làm việc chuyên nghiệp.</p></section>
        <section><h2>Học vấn</h2><h3>Đại học Công nghệ TP. Hồ Chí Minh (HUTECH)</h3><p>Công nghệ thông tin · 2022 – 2026</p><p>GPA: 3.2/4.0</p></section>
        <section><h2>Kỹ năng</h2><p>${skills}</p></section>
        <section><h2>Dự án tiêu biểu</h2><h3>Website quản lý tuyển dụng thực tập</h3><p>Xây dựng giao diện tìm kiếm việc làm, quản lý hồ sơ và theo dõi đơn ứng tuyển.</p><p><strong>Công nghệ:</strong> ${skills}</p></section>
        <section><h2>Kinh nghiệm</h2><h3>Thực tập sinh phát triển phần mềm</h3><p>Hỗ trợ phát triển giao diện, kiểm thử chức năng và phối hợp với nhóm theo quy trình Agile.</p></section>
        <section><h2>Hoạt động</h2><p>Thành viên câu lạc bộ Công nghệ thông tin HUTECH · Tham gia hoạt động học thuật và dự án nhóm.</p></section>
        <footer>Nội dung minh họa cho CV chưa có tệp đính kèm.</footer>
      </article>`;
    };
    const extractDocxText = async dataUrl => {
      const match = /^data:[^;,]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
      if (!match) throw new Error('Tệp DOCX không có định dạng dữ liệu hợp lệ.');
      const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      let endRecord = -1;
      for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
        if (view.getUint32(offset, true) === 0x06054b50) { endRecord = offset; break; }
      }
      if (endRecord < 0) throw new Error('Không đọc được cấu trúc tệp DOCX.');
      const entryCount = view.getUint16(endRecord + 10, true);
      const directoryOffset = view.getUint32(endRecord + 16, true);
      let documentBytes = null;
      for (let index = 0, offset = directoryOffset; index < entryCount; index++) {
        if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Tệp DOCX bị lỗi cấu trúc.');
        const method = view.getUint16(offset + 10, true);
        const compressedSize = view.getUint32(offset + 20, true);
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        const localOffset = view.getUint32(offset + 42, true);
        const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
        if (name === 'word/document.xml') {
          if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Không đọc được nội dung DOCX.');
          const localNameLength = view.getUint16(localOffset + 26, true);
          const localExtraLength = view.getUint16(localOffset + 28, true);
          const contentOffset = localOffset + 30 + localNameLength + localExtraLength;
          const compressed = bytes.slice(contentOffset, contentOffset + compressedSize);
          if (method === 0) documentBytes = compressed;
          else if (method === 8 && typeof DecompressionStream !== 'undefined') {
            const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            documentBytes = new Uint8Array(await new Response(stream).arrayBuffer());
          } else {
            throw new Error('Trình duyệt chưa hỗ trợ giải nén tệp DOCX. Hãy tải tệp xuống để xem.');
          }
          break;
        }
        offset += 46 + nameLength + extraLength + commentLength;
      }
      if (!documentBytes) throw new Error('Không tìm thấy nội dung văn bản trong tệp DOCX.');
      const xml = new DOMParser().parseFromString(new TextDecoder().decode(documentBytes), 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('Không thể đọc nội dung văn bản trong tệp DOCX.');
      return [...xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'p')]
        .map(paragraph => [...paragraph.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't')]
          .map(text => text.textContent).join(''))
        .filter(text => text.trim());
    };
    const openCVPreview = async cv => {
      $('.cv-preview-modal')?.remove();
      const overlay = document.createElement('div');
      overlay.className = 'cv-preview-modal';
      overlay.innerHTML = `<section class="cv-preview-dialog" role="dialog" aria-modal="true" aria-label="Xem ${escapeHtml(cv.name)}" tabindex="-1">
        <header class="cv-preview-toolbar"><strong>${escapeHtml(cv.name)}</strong>
          <div><button class="btn btn-outline" type="button" data-print><i class="fas fa-print"></i> In CV</button>
            <button class="cv-preview-close" type="button" aria-label="Đóng">&times;</button></div>
        </header><div class="cv-preview-content" data-preview-content></div></section>`;
      document.body.append(overlay);
      const close = () => overlay.remove();
      $('.cv-preview-close', overlay).addEventListener('click', close);
      overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
      overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
      $('[data-print]', overlay).addEventListener('click', () => {
        const frame = $('iframe', overlay);
        if (frame) {
          frame.contentWindow?.print();
          return;
        }
        const page = $('.cv-preview-page', overlay);
        if (!page) {
          toast('Chưa có nội dung CV để in.', 'error');
          return;
        }
        const printFrame = document.createElement('iframe');
        printFrame.setAttribute('aria-hidden', 'true');
        printFrame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
        printFrame.srcdoc = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(cv.name)}</title>
          <style>body{margin:0;padding:24px;font:14px/1.6 Arial,sans-serif;color:#27334e}
          .cv-preview-page{max-width:760px;margin:auto;padding:32px;background:#fff}
          .cv-preview-header{display:flex;justify-content:space-between;border-bottom:3px solid #5b55df;padding-bottom:18px}
          .cv-preview-header h1{font-size:28px;margin:0 0 6px}.cv-preview-header p,.cv-preview-page section p{margin:4px 0;color:#52617d}
          .cv-preview-page section{margin-top:20px}.cv-preview-page section h2{font-size:14px;color:#5146ce;border-bottom:1px solid #ddd;padding-bottom:5px}
          .cv-preview-docx{white-space:pre-wrap}.cv-preview-docx p{margin:0 0 10px}
          @page{size:A4;margin:16mm}@media print{body{padding:0}}</style></head><body>${page.outerHTML}</body></html>`;
        printFrame.onload = () => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          printFrame.contentWindow?.addEventListener('afterprint', () => printFrame.remove(), { once: true });
        };
        document.body.append(printFrame);
      });
      const content = $('.cv-preview-content', overlay);
      if (cv.type === 'PDF' && /^data:application\/pdf;base64,/i.test(cv.data || '')) {
        content.innerHTML = `<iframe class="cv-preview-pdf" title="Nội dung CV ${escapeHtml(cv.name)}" src="${cv.data}"></iframe>`;
      } else if (cv.type === 'DOCX' && cv.data) {
        content.innerHTML = '<p class="cv-preview-loading">Đang mở nội dung CV...</p>';
        try {
          const paragraphs = await extractDocxText(cv.data);
          const page = document.createElement('article');
          page.className = 'cv-preview-page cv-preview-docx';
          paragraphs.forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            page.append(paragraph);
          });
          content.replaceChildren(page);
        } catch (error) {
          const message = document.createElement('div');
          message.className = 'cv-preview-error';
          message.setAttribute('role', 'alert');
          message.textContent = error.message;
          if (/^data:[^;,]+;base64,/i.test(cv.data)) {
            const download = document.createElement('a');
            download.href = cv.data;
            download.download = `${cv.name}.docx`;
            download.textContent = 'Tải CV xuống';
            message.append(download);
          }
          content.replaceChildren(message);
        }
      } else if (cv.type === 'PDF' || cv.type === 'ONLINE') {
        content.innerHTML = renderSampleCV(cv);
      } else {
        const message = document.createElement('div');
        message.className = 'cv-preview-error';
        message.textContent = `Định dạng ${cv.type} chưa hỗ trợ xem trực tiếp trong trình duyệt.`;
        if (/^data:[^;,]+;base64,/i.test(cv.data || '')) {
          const download = document.createElement('a');
          download.href = cv.data;
          download.download = `${cv.name}.${cv.type.toLowerCase()}`;
          download.textContent = 'Tải CV xuống';
          message.append(download);
        }
        content.replaceChildren(message);
      }
      $('.cv-preview-dialog', overlay).focus();
    };
    const render = () => {
      grid.innerHTML = cvs.map(cv => `<article class="cv-card ${cv.default ? 'default' : ''}" data-cv-id="${cv.id}">
        <div class="cv-icon"><i class="fas ${cv.type === 'ONLINE' ? 'fa-globe' : 'fa-file-pdf'}"></i></div>
        <h3>${escapeHtml(cv.name)}</h3><p class="cv-meta">${escapeHtml(cv.type)} · ${escapeHtml(cv.date)}</p>
        ${cv.default ? '<span class="badge-default">Mặc định</span>' : ''}
        <div class="cv-actions"><button class="btn btn-outline" data-cv-action="view" title="Xem"><i class="fas fa-eye"></i> Xem</button>
          ${cv.data ? '<button class="btn btn-outline" data-cv-action="download" title="Tải xuống"><i class="fas fa-download"></i></button>' : ''}
          ${!cv.default ? '<button class="btn btn-outline" data-cv-action="default">Đặt mặc định</button>' : ''}
          <button class="btn btn-outline" data-cv-action="delete" title="Xóa"><i class="fas fa-trash"></i></button></div></article>`).join('') +
        '<button class="cv-card add-new" type="button" data-cv-upload><i class="fas fa-plus-circle"></i><span>Thêm CV mới</span></button>';
      write(PORTAL_KEYS.cvs, cvs);
    };
    $('.page-header .btn-primary')?.addEventListener('click', () => upload.click());
    upload.addEventListener('change', () => {
      const file = upload.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast('Dung lượng tối đa là 2 MB.', 'error'); upload.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => {
        cvs.unshift({ id: Date.now(), name: file.name.replace(/\.[^.]+$/, ''), type: file.name.split('.').pop().toUpperCase(), date: new Date().toLocaleDateString('vi-VN'), default: cvs.length === 0, data: reader.result });
        render();
        toast('Đã tải CV lên.');
      };
      reader.readAsDataURL(file);
    });
    grid.addEventListener('click', event => {
      if (event.target.closest('[data-cv-upload]')) { upload.click(); return; }
      const action = event.target.closest('[data-cv-action]');
      if (!action) return;
      const cv = cvs.find(item => String(item.id) === action.closest('[data-cv-id]').dataset.cvId);
      if (!cv) return;
      if (action.dataset.cvAction === 'delete') {
        if (!confirm(`Xóa CV "${cv.name}"?`)) return;
        cvs = cvs.filter(item => item.id !== cv.id);
        if (!cvs.some(item => item.default) && cvs[0]) cvs[0].default = true;
      } else if (action.dataset.cvAction === 'default') {
        cvs.forEach(item => { item.default = item.id === cv.id; });
      } else if (action.dataset.cvAction === 'download' && cv.data) {
        const link = document.createElement('a'); link.href = cv.data; link.download = cv.name; link.click(); return;
      } else if (action.dataset.cvAction === 'view') {
        openCVPreview(cv);
        return;
      }
      render();
    });
    render();
  }

  function initNotifications() {
    const container = $('#tb-list');
    if (!container) return;
    const icons = { DOI_TRANG_THAI: 'fa-sync-alt', PHONG_VAN: 'fa-calendar-check', TIN_SAP_HET_HAN: 'fa-exclamation-triangle', DON_MOI: 'fa-file-alt' };
    let items = read(PORTAL_KEYS.notifications, THONG_BAO);
    const render = () => {
      const unreadCount = items.filter(item => !item.DaDoc).length;
      $$('.icon-btn .badge').forEach(badge => {
        badge.textContent = unreadCount;
        badge.hidden = unreadCount === 0;
      });
      container.innerHTML = `<button class="btn btn-outline" id="markAllRead">Đánh dấu tất cả đã đọc</button>` + (items.length ? items.map(item => `
        <button class="tb-item ${item.DaDoc ? '' : 'unread'}" data-notification="${item.MaThongBao}">
          <span class="tb-icon"><i class="fas ${icons[item.Loai] || 'fa-bell'}"></i></span>
          <span class="tb-content"><strong>${escapeHtml(item.TieuDe)}</strong><span>${escapeHtml(item.NoiDung)}</span><small>${escapeHtml(item.NgayTao)}</small></span>
          ${!item.DaDoc ? '<span class="dot"></span>' : ''}</button>`).join('') : '<p>Bạn chưa có thông báo nào.</p>');
    };
    container.addEventListener('click', event => {
      if (event.target.closest('#markAllRead')) items = items.map(item => ({ ...item, DaDoc: true }));
      else {
        const item = event.target.closest('[data-notification]');
        if (!item) return;
        items = items.map(note => String(note.MaThongBao) === item.dataset.notification ? { ...note, DaDoc: true } : note);
      }
      write(PORTAL_KEYS.notifications, items);
      render();
    });
    render();
  }

  function initChat() {
    const box = $('.chat-box');
    const transcript = $('#chat-messages');
    const input = $('.chat-input-wrap input');
    const form = $('.chat-input-wrap');
    const suggestions = $('#chat-suggestions');
    if (!box || !transcript || !input || !form) return;

    let user = null;
    try { user = JSON.parse(localStorage.getItem('HUTECH IT_user') || 'null'); } catch { user = null; }
    const role = ['student', 'employer', 'admin', 'vip'].includes(user?.role) ? user.role : 'guest';
    const storedUsers = read(PORTAL_KEYS.users, []);
    const users = Array.isArray(storedUsers) ? storedUsers : [];
    let contacts = [];
    if (role === 'employer') {
      contacts = users.filter(account => account.role === 'student' && account.email !== user?.email);
    } else if (role === 'student') {
      contacts = users.filter(account => account.role === 'employer');
    } else if (role === 'admin') {
      contacts = users.filter(account => ['student', 'employer'].includes(account.role));
    }

    const userName = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : (role === 'employer' ? 'Nhà tuyển dụng' : role === 'admin' ? 'Quản trị viên' : 'Sinh viên');
    const roleLabel = { student: 'Sinh viên', employer: 'Nhà tuyển dụng', admin: 'Quản trị viên', vip: 'Khách hàng VIP', guest: 'Khách' }[role];
    let activeContact = null;
    const encode = value => encodeURIComponent(String(value || '').trim().toLowerCase());
    const conversationKey = contact => {
      const emails = [String(user?.email || userName).toLowerCase(), String(contact?.email || contact?.role || 'support').toLowerCase()].sort();
      return `${PORTAL_KEYS.messages}.conversation.${encode(emails[0])}.${encode(emails[1])}`;
    };
    const contactName = contact => contact?.name || contact?.fullName || contact?.email || (role === 'employer' ? 'Khách hàng' : 'Nhà tuyển dụng');
    const messagesForContact = contact => read(conversationKey(contact), []);
    const persistMessage = (contact, message) => {
      const conversation = messagesForContact(contact);
      conversation.push(message);
      write(conversationKey(contact), conversation);
      return conversation;
    };

    const nameElement = $('#chat-contact-name');
    const statusElement = $('#chat-status');
    const description = $('#chat-role-description');
    $('#chat-role-label').textContent = role === 'employer' ? 'Khách hàng đang nhắn với nhà tuyển dụng' : `Hội thoại dành cho ${roleLabel.toLowerCase()}`;
    if (description) {
      description.textContent = role === 'employer'
        ? 'Trả lời tin nhắn từ khách hàng và sinh viên quan tâm đến tin tuyển dụng của bạn.'
        : role === 'student'
          ? 'Nhắn tin trao đổi với nhà tuyển dụng về cơ hội thực tập và hồ sơ ứng tuyển.'
          : role === 'admin'
            ? 'Theo dõi và hỗ trợ các cuộc trao đổi giữa sinh viên với nhà tuyển dụng.'
            : 'Trao đổi với bộ phận hỗ trợ HUTECH IT Pro.';
    }

    const render = () => {
      const messages = activeContact ? messagesForContact(activeContact) : [];
      transcript.replaceChildren();
      if (!activeContact) {
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = role === 'employer'
          ? 'Chưa có khách hàng hoặc sinh viên nào nhắn tin. Khi có hội thoại, bạn có thể chọn người liên hệ tại đây.'
          : 'Chưa có cuộc trò chuyện nào. Hãy chọn người liên hệ để bắt đầu.';
        transcript.append(empty);
      } else if (!messages.length) {
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = `Bắt đầu cuộc trò chuyện với ${contactName(activeContact)}.`;
        transcript.append(empty);
      } else {
        messages.forEach(message => {
          const ownMessage = message.senderEmail
            ? String(message.senderEmail).toLowerCase() === String(user?.email || '').toLowerCase()
            : message.from === 'user';
          const bubble = document.createElement('article');
          bubble.className = `chat-message ${ownMessage ? 'user' : 'support'}`;
          const author = document.createElement('span');
          author.className = 'chat-message-author';
          author.textContent = ownMessage ? userName : (message.senderName || contactName(activeContact));
          const content = document.createElement('span');
          content.textContent = message.text || '';
          const time = document.createElement('time');
          time.className = 'chat-message-time';
          const timestamp = message.at || Date.now();
          time.dateTime = new Date(timestamp).toISOString();
          time.textContent = new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          bubble.append(author, content, time);
          transcript.append(bubble);
        });
      }
      transcript.scrollTop = transcript.scrollHeight;
      input.disabled = !activeContact;
      form.querySelector('button[type="submit"]').disabled = !activeContact;
      input.placeholder = activeContact ? `Nhắn tin với ${contactName(activeContact)}...` : 'Chọn người liên hệ để nhắn tin';
    };

    const openConversation = contact => {
      activeContact = contact;
      nameElement.textContent = contactName(contact);
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Hội thoại riêng';
      render();
    };

    if (role === 'employer' || role === 'student' || role === 'admin') {
      if (contacts.length) {
        const picker = document.createElement('label');
        picker.className = 'chat-contact-picker';
        picker.innerHTML = `<span class="sr-only">Chọn khách hàng hoặc nhà tuyển dụng</span><select class="form-control" aria-label="Chọn người liên hệ">
          <option value="">Chọn người liên hệ</option>
          ${contacts.map((contact, index) => `<option value="${index}">${escapeHtml(contactName(contact))} · ${role === 'employer' ? 'Khách hàng / sinh viên' : 'Nhà tuyển dụng'} · ${escapeHtml(contact.email || '')}</option>`).join('')}
        </select>`;
        $('.chat-header').append(picker);
        $('select', picker).addEventListener('change', event => {
          const contact = contacts[Number(event.target.value)];
          if (contact) openConversation(contact);
          else { activeContact = null; nameElement.textContent = 'Chọn người liên hệ'; render(); }
        });
        openConversation(contacts[0]);
      } else {
        nameElement.textContent = role === 'employer' ? 'Chưa có khách hàng nhắn tin' : 'Chưa có người liên hệ';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Chưa có hội thoại';
        render();
      }
    } else {
      activeContact = { role: 'support', name: 'Hỗ trợ HUTECH', email: 'support@hutechintern.vn' };
      nameElement.textContent = activeContact.name;
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Hỗ trợ khách hàng';
      render();
    }

    if (suggestions) suggestions.hidden = role === 'employer' || role === 'admin';
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || !activeContact) return;
      const message = {
        senderEmail: String(user?.email || '').toLowerCase(),
        senderName: userName,
        senderRole: role,
        text,
        at: Date.now()
      };
      const conversation = persistMessage(activeContact, message);
      input.value = '';
      render();
      if (activeContact.role === 'support') {
        const autoReply = role === 'vip'
          ? 'Cảm ơn bạn đã liên hệ HUTECH IT Pro. Bộ phận hỗ trợ sẽ tiếp nhận và phản hồi sớm.'
          : role === 'guest'
            ? 'Cảm ơn bạn đã liên hệ HUTECH Intern. Vui lòng đăng nhập để bắt đầu hội thoại với đúng vai trò tài khoản.'
            : 'Tin nhắn của bạn đã được ghi nhận. Bộ phận hỗ trợ sẽ phản hồi sớm.';
        conversation.push({ senderEmail: activeContact.email, senderName: activeContact.name, senderRole: 'support', text: autoReply, at: Date.now() });
        write(conversationKey(activeContact), conversation);
        render();
      }
    });
    if (suggestions) {
      suggestions.addEventListener('click', event => {
        const button = event.target.closest('.chat-suggestion');
        if (!button) return;
        input.value = button.textContent;
        form.requestSubmit();
      });
    }
  }

  function initHeader() {
    let user;
    try { user = JSON.parse(localStorage.getItem('HUTECH IT_user')); } catch { user = null; }
    if (!user) return;
    $$('.user-name').forEach(name => { if (user.name) name.textContent = user.name; });
    $$('.avatar').forEach(avatar => {
      if (user.name) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=00b14f&color=fff`;
    });
  }

  function requireAccountAccess() {
    const page = location.pathname.split('/').pop();
    const requiredRole = page === 'hutech-it-pro.html'
      ? 'vip'
      : page === 'doanh-nghiep.html' || page === 'dang-tin.html' ? 'employer'
        : page === 'admin.html' ? 'admin' : null;
    if (!requiredRole) return true;

    let user;
    try { user = JSON.parse(localStorage.getItem('HUTECH IT_user')); } catch { user = null; }
    const accounts = read(PORTAL_KEYS.users, []);
    const hasMatchingAccount = user?.role === requiredRole
      && typeof user.email === 'string'
      && Array.isArray(accounts)
      && accounts.some(account => account.role === requiredRole
        && account.email === user.email
        && typeof account.passwordHash === 'string'
        && account.passwordHash.length > 0);

    if (hasMatchingAccount) return true;
    window.location.replace(`../index.html?portal=${requiredRole}&next=${encodeURIComponent(page)}`);
    return false;
  }

  function initVIPAccount() {
    if (!location.pathname.endsWith('/hutech-it-pro.html')) return;
    let user;
    try { user = JSON.parse(localStorage.getItem('HUTECH IT_user')); } catch { user = null; }
    $('#vipAccountName').textContent = user.name || 'Khách hàng VIP';
    $('#vipAccountEmail').textContent = user.email;
    $('#vipLogout').addEventListener('click', () => {
      localStorage.removeItem('HUTECH IT_user');
      window.location.replace('../index.html');
    });
  }

  function init() {
    if (!requireAccountAccess()) return;

    document.documentElement.insertAdjacentHTML('beforeend', `<style>
      .portal-modal{position:fixed;inset:0;z-index:1000;background:#0f172a88;display:grid;place-items:center;padding:16px}
      .portal-dialog{position:relative;background:#fff;width:min(560px,100%);max-height:90vh;overflow:auto;padding:24px;border-radius:10px;box-shadow:0 20px 60px #0003}
      .portal-dialog h2{font-size:20px;margin:0 32px 18px 0}.portal-fields{display:grid;gap:14px}.portal-field{display:grid;gap:6px;font-size:14px;font-weight:600}
      .portal-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.portal-close{position:absolute;right:14px;top:10px;border:0;background:none;font-size:28px;cursor:pointer;color:#64748b}
      .portal-toast{position:fixed;z-index:1100;right:20px;bottom:20px;background:#166534;color:#fff;padding:12px 18px;border-radius:8px;box-shadow:0 8px 24px #0002}.portal-toast.error{background:#b91c1c}.portal-toast.info{background:#1e3a5f}
      .tb-item{width:100%;text-align:left;cursor:pointer;color:inherit}.tb-content{display:grid;gap:3px;flex:1}.tb-content strong{font-size:15px}.tb-content span{font-size:14px;color:#64748b}.tb-content small{font-size:12px;color:#94a3b8}
      .empty-state{grid-column:1/-1;text-align:center;padding:40px 20px;color:#64748b}.empty-state h3{margin:10px 0}.don-right .btn{padding:6px 12px;font-size:13px}
    </style>`);
    initHeader();
    initVIPAccount();
    renderSavedJobs();
    initApplications();
    initJobApplication();
    initPosting();
    initEmployerDashboard();
    initAdminDashboard();
    initCompanyDirectory();
    initProfile();
    initCVs();
    initNotifications();
    initChat();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();