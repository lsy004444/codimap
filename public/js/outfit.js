(function() {

let uploadedFiles    = [];
let pendingLocation  = null;
let selectedSeason   = null;

window.addEventListener('DOMContentLoaded', () => {
  for (let i = 1; i <= 4; i++) addLinkRow();
});

async function openModal() {
  try {
    const response = await fetch('/api/auth/mypage');
    const result = await response.json();
    if(!result.success) {
      window.showToast('🔒 로그인이 필요합니다');  // ← window. 붙이기
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return;
    }
    document.getElementById('uploadModalOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  } catch(e) {
    window.showToast('🔒 로그인이 필요합니다');  // ← window. 붙이기
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }
}

function closeModal() {

  document.getElementById('uploadModalOverlay').classList.remove('show');
  document.body.style.overflow = '';

  uploadedFiles = [];
  pendingLocation = null;
  selectedSeason = null;

  const descInput = document.getElementById('descInput');
  if (descInput) descInput.value = ''; 

  renderPreviews(); 
  hideAllMeta();    

  const list = document.getElementById('linkList');
  if (list) {
    list.innerHTML = ''; 
    linkCount = 0;       
    for (let i = 1; i <= 4; i++) addLinkRow(); 
  }
}


function handleFiles(files) {
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => uploadedFiles.push(file));
  renderPreviews();
  parseMetadata(uploadedFiles[0]);
}

function renderPreviews() {
  const list = document.getElementById('previewList');
  list.innerHTML = '';
  uploadedFiles.forEach((file, idx) => {
    const url  = URL.createObjectURL(file);
    const item = document.createElement('div');
    item.className = 'preview-item';
    // 전역으로 바인딩된 window 메소드를 안전하게 지칭하도록 수정
    item.innerHTML = `
      <img src="${url}" alt="preview-${idx}" />
      ${idx === 0 ? '<div class="badge-rep">대표</div>' : ''}
      <button class="btn-del" onclick="window.removeFile(${idx})">✕</button>
    `;
    list.appendChild(item);
  });
}

function removeFile(idx) {
  uploadedFiles.splice(idx, 1);
  renderPreviews();
  if (uploadedFiles.length === 0) {
    hideAllMeta();
  } else {
    parseMetadata(uploadedFiles[0]);
  }
}

function hideAllMeta() {
  document.getElementById('metaBox').style.display              = 'none';
  document.getElementById('metaMissing').style.display          = 'none';
  document.getElementById('selectedLocationArea').style.display = 'none';
}

function parseMetadata(file) {
  EXIF.getData(file, function() {
    const dateStr = EXIF.getTag(this, 'DateTimeOriginal');
    const lat     = EXIF.getTag(this, 'GPSLatitude');
    const latRef  = EXIF.getTag(this, 'GPSLatitudeRef');
    const lon     = EXIF.getTag(this, 'GPSLongitude');
    const lonRef  = EXIF.getTag(this, 'GPSLongitudeRef');

    const hasDate = !!dateStr;
    const hasGPS  = lat && lon;

    let formattedDate = '날짜 정보 없음';
    let season        = '';
    if (hasDate) {
      const [datePart, timePart] = dateStr.split(' ');
      const [y, m, d] = datePart.split(':');
      const [hh, mm]  = timePart.split(':');
      formattedDate   = `${y}.${m}.${d} · ${hh}:${mm}`;
      season          = getSeason(parseInt(m, 10));
      selectedSeason = season;
    }

    let locationStr = null;
    if (hasGPS) {
      const latitude  = dmsToDecimal(lat, latRef);
      const longitude = dmsToDecimal(lon, lonRef);
      locationStr     = `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`;
    }

    if (hasDate || hasGPS) {
      showMetaTags(formattedDate, locationStr, season);
      document.getElementById('metaMissing').style.display = 'none';
    } else {
      document.getElementById('metaBox').style.display     = 'none';
      document.getElementById('metaMissing').style.display = 'block';
    }
  });
}

function showMetaTags(dateStr, locationStr, season) {
  const box  = document.getElementById('metaBox');
  const tags = document.getElementById('metaTags');
  box.style.display = 'block';
  tags.innerHTML = `
    <div class="meta-tag">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>${dateStr}</span>
    </div>
    ${locationStr ? `
    <div class="meta-tag">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>${locationStr}</span>
    </div>` : ''}
    ${season ? `
    <div class="meta-tag">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
        <path d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2"/>
        <path d="M12 6v6l3 3"/>
      </svg>
      <span>${season}</span>
    </div>` : ''}
  `;
  document.getElementById('metaMissing').style.display = 'none';
}

function dmsToDecimal(dms, ref) {
  const d = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return (ref === 'S' || ref === 'W') ? -d : d;
}

function getSeason(month) {
  if ([3,4,5].includes(month))   return '봄';
  if ([6,7,8].includes(month))   return '여름';
  if ([9,10,11].includes(month)) return '가을';
  return '겨울';
}

function openSubtab() {
  document.getElementById('subtabOverlay').classList.add('show');
}

function closeSubtab() {
  document.getElementById('subtabOverlay').classList.remove('show');
  //pendingLocation = null;
  document.getElementById('addrResult').classList.remove('show');
  document.getElementById('btnConfirmAddr').style.display = 'none';
  document.getElementById('seasonSelect').style.display   = 'none';
}

function openKakaoPostcode() {
  new daum.Postcode({
    oncomplete: function(data) {
      const sido    = data.sido;
      const sigungu = data.sigungu;
      const bname   = data.bname;
      const full    = `${sido} ${sigungu} ${bname}`;

      document.getElementById('addrPreview').textContent      = full;
      document.getElementById('addrResult').classList.add('show');
      document.getElementById('btnConfirmAddr').style.display = 'block';
      document.getElementById('seasonSelect').style.display   = 'block';

      //수정. 카카오 geocoder로 위도/경도 가져오기 //
      kakao.maps.load(function() { 
      var geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(full, function(result, status) {
        if(status === kakao.maps.services.Status.OK) {
          pendingLocation = {
            sido, sigungu, bname, full,
            latitude: parseFloat(result[0].y),
            longitude: parseFloat(result[0].x)
          };
        } else {
           pendingLocation = { sido, sigungu, bname, full };
        }
      });
    });
    }
  }).open();
}

function selectSeason(season) {
  selectedSeason = season;
  document.querySelectorAll('.btn-season').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(season));
  });
}

function confirmLocation() {
  if (!pendingLocation) return;
  if (!selectedSeason) {
    showToast('계절을 선택해주세요.');
    return;
  }
  //추가
  pendingLocation.season = selectedSeason;
  document.getElementById('selectedLocationText').textContent    = pendingLocation.full;
  document.getElementById('selectedLocationArea').style.display  = 'flex';
  document.getElementById('metaMissing').style.display           = 'none';
  showMetaTags('날짜 정보 없음', pendingLocation.full, selectedSeason);
  closeSubtab();
  selectedSeason = null;
}

let linkCount = 0;

const svgLink = `
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`;

const svgDollar = `
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>`;

function addLinkRow() {
  linkCount++;
  const list = document.getElementById('linkList');
  const row  = document.createElement('div');
  row.className = 'link-row';
  row.id        = `linkRow-${linkCount}`;
  row.innerHTML = `
    <div class="link-icon"
         id="linkIcon-${linkCount}"
         data-affiliate="0"
         onclick="window.toggleAffiliate(${linkCount})"
         title="클릭하면 수익성 링크로 설정"
         style="cursor:pointer;">
      ${svgLink}
    </div>
    <input class="link-input" type="url"
           placeholder="https://shop.example.com/product"
           id="link-${linkCount}" />
    <button class="btn-del-link" onclick="window.removeLinkRow('linkRow-${linkCount}')">✕</button>
  `;
  list.appendChild(row);
}

function toggleAffiliate(idx) {
  const icon        = document.getElementById(`linkIcon-${idx}`);
  const isAffiliate = icon.dataset.affiliate === '1';

  if (isAffiliate) {
    icon.dataset.affiliate = '0';
    icon.style.background  = '#f3f4f6';
    icon.innerHTML         = svgLink;
    icon.title             = '클릭하면 수익성 링크로 설정';
  } else {
    icon.dataset.affiliate = '1';
    icon.style.background  = '#f0fdf4';
    icon.innerHTML         = svgDollar;
    icon.title             = '클릭하면 일반 링크로 변경';
  }
}

function removeLinkRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}

function handleCancel() {
  if (confirm('작성 중인 내용이 사라집니다. 취소하시겠어요?')) {
    closeModal();
  }
}


function handleRegister() {
  if (uploadedFiles.length === 0) {
    showToast('사진을 한 장 이상 업로드해주세요.');
    return;
  }
  const desc = document.getElementById('descInput').value.trim();
  if (!desc) {
    showToast('게시물 설명을 입력해주세요.');
    return;
  }

  const locationSelected = pendingLocation || 
  document.getElementById('selectedLocationArea').style.display !== 'none';

if (!locationSelected) {
  showToast('지역을 선택해주세요.');
  return;
}

const metaBox = document.getElementById('metaBox');
const seasonSelected = selectedSeason || metaBox.style.display !== 'none';

if (!seasonSelected) {
  showToast('계절을 선택해주세요.');
  return;
}

  const links = Array.from(document.querySelectorAll('.link-row')).map(row => {
    const icon      = row.querySelector('.link-icon');
    const input     = row.querySelector('.link-input');
    const url       = input ? input.value.trim() : '';
    const affiliate = icon ? icon.dataset.affiliate === '1' : false;
    return { url, affiliate };
  }).filter(item => item.url !== '');


  const formData = new FormData();

 
  uploadedFiles.forEach(file => {
    formData.append('images', file);
  });


  formData.append('description', desc);
  formData.append('links', JSON.stringify(links));
  formData.append('location', JSON.stringify(pendingLocation));

  console.log('pendingLocation:', pendingLocation);

  if (pendingLocation && pendingLocation.latitude) {
    formData.append('latitude', pendingLocation.latitude);
    formData.append('longitude', pendingLocation.longitude);
  }
  formData.append('season', pendingLocation?.season || selectedSeason || '');
  fetch('/api/outfit/register', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('등록되었습니다!');
      closeModal();
    } else {
      showToast('등록 실패: ' + data.message);
    }
  })
  .catch(err => {
    console.error('오류:', err);
    showToast('서버 오류가 발생했습니다.');
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'upload-toast hidden';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.remove('hidden'), 10);
  setTimeout(() => {
    toast.classList.add('hidden');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

window.openModal         = openModal;
window.closeModal        = closeModal;
window.handleCancel      = handleCancel;
window.handleRegister    = handleRegister;
window.handleFiles       = handleFiles;
window.removeFile        = removeFile;
window.openSubtab        = openSubtab;
window.closeSubtab       = closeSubtab;
window.openKakaoPostcode = openKakaoPostcode;
window.selectSeason      = selectSeason;
window.confirmLocation   = confirmLocation;
window.addLinkRow        = addLinkRow;
window.removeLinkRow     = removeLinkRow;
window.toggleAffiliate   = toggleAffiliate;
window.showToast = showToast;
})();