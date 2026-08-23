// ──────────────────────────────────────────
// CODIMAP 관리자 페이지
// ──────────────────────────────────────────
const $ = id => document.getElementById(id);
const toast = $('toast');

const STATUS_LABEL = {
    pending:  { text: '접수됨',   cls: 'badge-pending'  },
    resolved: { text: '처리완료', cls: 'badge-resolved' },
    rejected: { text: '반려',     cls: 'badge-rejected' },
};

let currentStatusFilter = '';

// ── 유틸 ──
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('ko-KR');
}

// ── 관리자 권한 확인 ──
async function checkAdmin() {
    try {
        const res = await fetch('/api/admin/check');
        const { isAdmin } = await res.json();
        if (!isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            location.href = '/';
            return false;
        }
        return true;
    } catch {
        location.href = '/';
        return false;
    }
}

// ── 상태 필터 ──
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStatusFilter = btn.dataset.status;
        loadReports();
    });
});

// ── 신고 목록 로드 ──
async function loadReports() {
    const list = $('reportList');
    list.innerHTML = `<p class="admin-empty">불러오는 중...</p>`;

    try {
        const query = currentStatusFilter ? `?status=${currentStatusFilter}` : '';
        const res = await fetch(`/api/admin/reports${query}`);
        const result = await res.json();

        if (!result.success) {
            list.innerHTML = `<p class="admin-empty">${escHtml(result.message)}</p>`;
            return;
        }
        if (result.reports.length === 0) {
            list.innerHTML = `<p class="admin-empty">신고 내역이 없습니다.</p>`;
            return;
        }

        list.innerHTML = result.reports.map(r => {
            const badge = STATUS_LABEL[r.STATUS] || STATUS_LABEL.pending;
            const suspended = r.REPORTED_STATUS === 'SUSPENDED';
            return `
            <div class="report-card">
                <div class="report-thumb">
                    ${r.POST_IMAGE
                        ? `<img src="${escHtml(r.POST_IMAGE)}" alt="게시물">`
                        : `<div class="no-thumb">이미지<br>없음</div>`}
                </div>
                <div class="report-info">
                    <div class="report-top">
                        <span class="status-badge ${badge.cls}">${badge.text}</span>
                        <span class="report-date">${formatDate(r.CREATED_DATE)}</span>
                    </div>
                    <p class="report-reason">📢 ${escHtml(r.REASON)}</p>
                    <p class="report-meta">
                        신고자 <b>@${escHtml(r.REPORTER_PROFILE_ID)}</b>
                        →  피신고자 <b>@${escHtml(r.REPORTED_PROFILE_ID)}</b>
                        <span class="report-count" title="이 유저가 받은 전체 신고 / 미처리">누적 ${r.REPORTED_TOTAL}건${Number(r.REPORTED_PENDING) > 1 ? ` · 미처리 ${r.REPORTED_PENDING}` : ''}</span>
                        ${suspended ? '<span class="suspended-tag">정지됨</span>' : ''}
                    </p>
                    <p class="report-post">게시물: ${escHtml(r.POST_CONTENT || '(삭제됨/내용없음)')}</p>
                    <div class="report-actions">
                        ${r.STATUS !== 'resolved' ? `<button class="btn-resolve" onclick="setReportStatus(${r.REPORT_ID}, 'resolved')">처리완료</button>` : ''}
                        ${r.STATUS !== 'rejected' ? `<button class="btn-reject" onclick="setReportStatus(${r.REPORT_ID}, 'rejected')">반려</button>` : ''}
                        ${r.POST_ID ? `<button class="btn-delete" onclick="deletePost(${r.POST_ID})">게시물 삭제</button>` : ''}
                        ${suspended
                            ? `<button class="btn-unsuspend" onclick="setUserStatus(${r.REPORTED_USER_ID}, 'ACTIVE')">정지 해제</button>`
                            : `<button class="btn-suspend" onclick="setUserStatus(${r.REPORTED_USER_ID}, 'SUSPENDED')">유저 정지</button>`}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="admin-empty">신고 목록을 불러오지 못했습니다.</p>`;
    }
}

// ── 액션 ──
window.setReportStatus = async function (reportId, status) {
    try {
        const res = await fetch(`/api/admin/reports/${reportId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const result = await res.json();
        showToast(result.message || (result.success ? '처리되었습니다.' : '처리에 실패했습니다.'));
        if (result.success) loadReports();
    } catch {
        showToast('처리에 실패했습니다.');
    }
};

window.setUserStatus = async function (userId, status) {
    const msg = status === 'SUSPENDED' ? '이 유저를 정지하시겠습니까?' : '정지를 해제하시겠습니까?';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const result = await res.json();
        showToast(result.message || '처리되었습니다.');
        if (result.success) loadReports();
    } catch {
        showToast('처리에 실패했습니다.');
    }
};

window.deletePost = async function (postId) {
    if (!confirm('이 게시물을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    try {
        const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
        const result = await res.json();
        showToast(result.message || '처리되었습니다.');
        if (result.success) loadReports();
    } catch {
        showToast('게시물 삭제에 실패했습니다.');
    }
};

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAdmin()) {
        loadReports();
    }
});
