document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filter-linhvuc').innerHTML = LINH_VUC.map(lv =>
    `<label><input type="checkbox" value="${lv.MaLinhVuc}" class="filter-lv"> ${lv.TenLinhVuc}</label>`
  ).join('');

  document.getElementById('filter-tinh').innerHTML = TINH_THANH.map(t =>
    `<label><input type="checkbox" value="${t.MaTinhThanh}" class="filter-tinh"> ${t.TenTinhThanh}</label>`
  ).join('');

  const lvParam = getQueryParam('linhvuc');
  if (lvParam) {
    const cb = document.querySelector(`.filter-lv[value="${lvParam}"]`);
    if (cb) cb.checked = true;
  }

  applyFilter();
});

function applyFilter() {
  let jobs = getAllPortalJobs();

  const lvChecked = [...document.querySelectorAll('.filter-lv:checked')].map(c => +c.value);
  if (lvChecked.length) jobs = jobs.filter(j => lvChecked.includes(j.MaLinhVuc));

  const tinhChecked = [...document.querySelectorAll('.filter-tinh:checked')].map(c => +c.value);
  if (tinhChecked.length) jobs = jobs.filter(j => tinhChecked.includes(j.MaTinhThanh));

  const company = Number(getQueryParam('company'));
  if (company) jobs = jobs.filter(j => j.MaDoanhNghiep === company);

  const keyword = (getQueryParam('q') || '').trim().toLocaleLowerCase('vi');
  if (keyword) jobs = jobs.filter(j => [j.TieuDe, j.TenDoanhNghiep, j.TenLinhVuc, ...(j.KyNang || [])]
    .some(value => String(value).toLocaleLowerCase('vi').includes(keyword)));

  const category = getQueryParam('linhvuc');
  if (category && !/^\d+$/.test(category)) {
    const normalizedCategory = category.toLocaleLowerCase('vi');
    const categoryIds = {
      'frontend developer': 1, 'backend developer': 1, 'fullstack developer': 1,
      'mobile developer': 2, 'ai engineer': 3, 'data analyst': 4,
      'qa tester': 5, 'devops engineer': 6, 'cyber security': 7
    };
    if (categoryIds[normalizedCategory]) {
      jobs = jobs.filter(j => j.MaLinhVuc === categoryIds[normalizedCategory]);
    } else {
      jobs = jobs.filter(j => [j.TieuDe, j.TenLinhVuc, ...(j.KyNang || [])]
        .some(value => String(value).toLocaleLowerCase('vi').includes(normalizedCategory)));
    }
  }

  const htChecked = [...document.querySelectorAll('.filter-hinhthuc:checked')].map(c => c.value);
  if (htChecked.length) jobs = jobs.filter(j => htChecked.includes(j.HinhThucLamViec));

  if (document.getElementById('filter-luong').checked) {
    jobs = jobs.filter(j => j.CoLuong);
  }

  const sort = document.getElementById('sort-select').value;
  if (sort === 'moi') jobs.sort((a, b) => new Date(b.NgayTao) - new Date(a.NgayTao));
  else if (sort === 'luotxem') jobs.sort((a, b) => b.LuotXem - a.LuotXem);
  else if (sort === 'han') jobs.sort((a, b) => new Date(a.HanNop) - new Date(b.HanNop));

  document.getElementById('result-count').textContent = `Tìm thấy ${jobs.length} tin tuyển dụng`;
  document.getElementById('job-list').innerHTML = jobs.length
    ? jobs.map(renderJobCard).join('')
    : '<div class="empty-state"><i class="fas fa-search"></i><h3>Không tìm thấy tin phù hợp</h3><p>Thử bỏ bớt bộ lọc</p></div>';
}