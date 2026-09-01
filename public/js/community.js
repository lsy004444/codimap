// ──────────────────────────────────────────
// 커뮤니티
//   ※ DB 는 POST 테이블 재사용 + TOPIC 컬럼 (db/migrations/001_add_post_topic.sql)
//     TOPIC IS NULL      → 코디 게시물 (지도/피드)
//     TOPIC IS NOT NULL  → 커뮤니티 글 (주제 선택 안 하면 '기타'로 저장)
// ──────────────────────────────────────────

// 주제 목록 — 여기 한 곳만 고치면 버튼도 같이 바뀐다.
//   key   : DB의 POST.TOPIC 에 저장될 값 (나중에 바꾸면 기존 글 마이그레이션 필요)
//   label : 화면에 보이는 이름 (언제든 바꿔도 안전)
// 'all' 은 저장되는 주제가 아니라 "필터 안 함"을 뜻하는 화면 전용 값이다.
const TOPICS = [
    { key: 'all',       label: '전체' },
    { key: 'recommend', label: '코디추천' },
    { key: 'question',  label: '질문' },
    { key: 'daily',     label: '일상' },
    { key: 'etc',       label: '기타' },
];
// 실제로 저장 가능한 주제(= 'all' 제외) — 글쓰기 선택지, 기본값 판단에 사용
const WRITABLE_TOPICS = TOPICS.filter(t => t.key !== 'all');
const DEFAULT_TOPIC = 'etc';
const DEFAULT_AVATAR = '/images/default-avatar.svg';

const state = {
    topic: 'all',
    keyword: '',
    page: 0,
    pageSize: 10,
    isLoading: false,
    hasMore: true,
    posts: [],
    myUserId: null,
    likedIds: new Set(),
    scrappedIds: new Set(),
    currentPost: null,
    writeImages: [],
    writeTopic: DEFAULT_TOPIC,
};

const $ = id => document.getElementById(id);

// ── 주제 버튼 (목록 필터) ──
function renderTopics() {
    const nav = $('community-topics');
    if (!nav) return;

    nav.innerHTML = TOPICS.map(t => `
        <button class="community-topic${t.key === state.topic ? ' is-active' : ''}"
                data-topic="${t.key}">${t.label}</button>
    `).join('');

    nav.querySelectorAll('.community-topic').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.topic === state.topic) return;
            state.topic = btn.dataset.topic;
            renderTopics();
            resetAndLoad();
        });
    });
}

function topicLabel(key) {
    return TOPICS.find(t => t.key === key)?.label || key;
}

// ── 목록 ──
function resetAndLoad() {
    state.page = 0;
    state.hasMore = true;
    state.posts = [];
    loadPosts();
}

async function loadPosts() {
    if (state.isLoading || !state.hasMore) return;
    state.isLoading = true;

    const list = $('community-list');

    try {
        const params = new URLSearchParams({ page: state.page, size: state.pageSize });
        if (state.topic !== 'all') params.set('topic', state.topic);

        const res = await fetch(`/api/community/posts?${params}`);
        if (!res.ok) throw new Error();
        const { posts, total } = await res.json();

        state.posts.push(...posts);
        state.hasMore = state.posts.length < total;
        state.page++;

        renderList();
    } catch {
        showToast('게시글을 불러오지 못했습니다');
    }

    state.isLoading = false;
}

function excerpt(text, len = 80) {
    if (!text) return '';
    return text.length > len ? text.slice(0, len) + '…' : text;
}

function renderList() {
    const list = $('community-list');
    if (!list) return;

    if (!state.posts.length) {
        const topic = TOPICS.find(t => t.key === state.topic);
        const scope = state.topic === 'all' ? '' : `'${topic.label}' 주제에 `;
        list.innerHTML = `
            <div class="community-empty">
                <i class="ti ti-message-circle"></i>
                <p>${scope}아직 글이 없어요</p>
                <span>첫 번째 글을 남겨보세요.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = state.posts.map((post, i) => `
        <div class="community-item" data-i="${i}">
            ${post.images[0]
                ? `<img class="community-item-thumb" src="${post.images[0]}" alt="">`
                : '<div class="community-item-thumb community-item-thumb-empty"><i class="ti ti-note"></i></div>'}
            <div class="community-item-body">
                <span class="community-item-topic">${topicLabel(post.topic)}</span>
                <h3 class="community-item-title">${escHtml(post.title || '(제목 없음)')}</h3>
                <p class="community-item-excerpt">${escHtml(excerpt(post.desc))}</p>
                <div class="community-item-meta">
                    <span>${escHtml(post.user.username)}</span>
                    <span class="community-item-dot">·</span>
                    <span>${formatTime(post.createdAt)}</span>
                    <span class="community-item-stats"><i class="ti ti-heart"></i> ${post.likeCount}&nbsp;&nbsp;<i class="ti ti-eye"></i> ${post.viewCount}</span>
                </div>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.community-item').forEach(el => {
        const post = state.posts[Number(el.dataset.i)];
        el.addEventListener('click', () => { location.href = `/community?postId=${post.id}`; });
    });
}

// 목록 컨테이너를 스크롤 끝까지 내리면 다음 페이지 로드
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadPosts();
    }
});

// ── 검색 (아직 서버 연동 전) ──
function initSearch() {
    const input = $('community-search-input');
    if (!input) return;

    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        state.keyword = input.value.trim();
        showToast('검색은 아직 준비 중이에요');
    });
}

// ──────────────────────────────────────────
// 글쓰기
// ──────────────────────────────────────────
const writeOverlay = $('write-overlay');

function renderWriteTopicSelect() {
    const wrap = $('write-topic-select');
    wrap.innerHTML = WRITABLE_TOPICS.map(t => `
        <button type="button" class="community-topic${t.key === state.writeTopic ? ' is-active' : ''}"
                data-topic="${t.key}">${t.label}</button>
    `).join('');

    wrap.querySelectorAll('.community-topic').forEach(btn => {
        btn.addEventListener('click', () => {
            state.writeTopic = btn.dataset.topic;
            renderWriteTopicSelect();
        });
    });
}

function initWriteButton() {
    $('community-write-btn')?.addEventListener('click', () => {
        if (!state.myUserId) { redirectToLogin(); return; }
        state.writeTopic = DEFAULT_TOPIC;
        renderWriteTopicSelect();
        writeOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    $('write-close-btn').addEventListener('click', closeWriteModal);
    writeOverlay.addEventListener('click', e => { if (e.target === writeOverlay) closeWriteModal(); });

    $('write-image-input').addEventListener('change', e => {
        Array.from(e.target.files).forEach(file => state.writeImages.push(file));
        renderWritePreviews();
        e.target.value = '';
    });

    $('write-submit-btn').addEventListener('click', submitPost);
}

function closeWriteModal() {
    writeOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    $('write-title-input').value = '';
    $('write-content-input').value = '';
    state.writeImages = [];
    renderWritePreviews();
}

function renderWritePreviews() {
    const list = $('write-preview-list');
    list.innerHTML = state.writeImages.map((file, idx) => `
        <div class="write-preview-item">
            <img src="${URL.createObjectURL(file)}" alt="preview-${idx}">
            <button class="write-preview-remove" data-i="${idx}"><i class="ti ti-x"></i></button>
        </div>
    `).join('');
    list.querySelectorAll('.write-preview-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            state.writeImages.splice(Number(btn.dataset.i), 1);
            renderWritePreviews();
        });
    });
}

async function submitPost() {
    const title = $('write-title-input').value.trim();
    const content = $('write-content-input').value.trim();

    if (!content) { showToast('내용을 입력해주세요'); return; }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('topic', state.writeTopic);
    state.writeImages.forEach(file => formData.append('images', file));

    try {
        const res = await fetch('/api/community/posts', { method: 'POST', body: formData });
        if (res.status === 401) { redirectToLogin(); return; }
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message);

        showToast('게시글이 등록되었습니다');
        closeWriteModal();
        resetAndLoad();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        showToast(err.message || '등록에 실패했습니다');
    }
}

// ──────────────────────────────────────────
// 상세 페이지
//   모달이 아니라 /community?postId= 로 실제 주소 이동해서 들어온다.
//   목록 페이지(#community-page)와 상세 페이지(#detail-page)를 서로 바꿔 보여준다.
// ──────────────────────────────────────────
const communityPage = $('community-page');
const detailPage = $('detail-page');
const reportOverlay = $('report-overlay');

async function openDetail(postId) {
    try {
        const res = await fetch(`/api/community/posts/${postId}`);
        if (!res.ok) throw new Error();
        const { post } = await res.json();
        renderDetail(post);
        communityPage.classList.add('hidden');
        detailPage.classList.remove('hidden');
    } catch {
        showToast('게시글을 불러오지 못했습니다');
        location.href = '/community';
    }
}

function renderDetail(post) {
    state.currentPost = post;

    const imagesWrap = $('detail-images');
    if (post.images.length) {
        imagesWrap.classList.remove('hidden');
        imagesWrap.innerHTML = post.images.map(src => `<img src="${src}" alt="첨부 이미지">`).join('');
    } else {
        imagesWrap.classList.add('hidden');
        imagesWrap.innerHTML = '';
    }

    $('detail-avatar').style.backgroundImage = `url('${post.user.avatar || DEFAULT_AVATAR}')`;
    $('detail-user').textContent = post.user.username;
    $('detail-time').textContent = formatTime(post.createdAt);
    $('detail-title').textContent = post.title || '';
    $('detail-title').classList.toggle('hidden', !post.title);
    $('detail-desc').textContent = post.desc;

    $('detail-topic-badge').textContent = topicLabel(post.topic);

    const isOwn = state.myUserId && post.user.id === state.myUserId;
    $('detail-delete-btn').classList.toggle('hidden', !isOwn);
    $('detail-report-btn').classList.toggle('hidden', isOwn);

    loadComments(post.id);
}

// TODO: 좋아요/스크랩 버튼 복구. 백엔드(/api/feed/posts/:id/like, /scrap)는 이미
// 구현돼 있어서(feed.js와 동일 엔드포인트 재사용) 버튼만 다시 붙이면 됨.
function initDetailPage() {
    $('detail-delete-btn').addEventListener('click', async () => {
        const post = state.currentPost;
        if (!post || !confirm('이 게시글을 삭제할까요?')) return;
        try {
            const res = await fetch(`/api/community/posts/${post.id}`, { method: 'DELETE' });
            if (res.status === 401) { redirectToLogin(); return; }
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message);

            showToast('삭제되었습니다');
            location.href = '/community';
        } catch (err) {
            showToast(err.message || '삭제에 실패했습니다');
        }
    });

    $('detail-report-btn').addEventListener('click', () => reportOverlay.classList.remove('hidden'));
    $('report-cancel-btn').addEventListener('click', () => reportOverlay.classList.add('hidden'));
    reportOverlay.addEventListener('click', e => { if (e.target === reportOverlay) reportOverlay.classList.add('hidden'); });

    $('report-submit-btn').addEventListener('click', async () => {
        const reason = document.querySelector('input[name="report-reason"]:checked')?.value;
        if (!reason) { showToast('신고 사유를 선택해 주세요'); return; }
        const detail = $('report-detail').value.trim();

        try {
            const res = await fetch(`/api/feed/posts/${state.currentPost.id}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, detail }),
            });
            if (res.status === 401) { redirectToLogin(); return; }
            if (res.status === 409) { showToast('이미 신고한 게시물입니다'); reportOverlay.classList.add('hidden'); return; }
            if (!res.ok) {
                const { message } = await res.json().catch(() => ({}));
                showToast(message || '신고 처리에 실패했습니다');
                reportOverlay.classList.add('hidden');
                return;
            }

            reportOverlay.classList.add('hidden');
            const checkedEl = document.querySelector('input[name="report-reason"]:checked');
            if (checkedEl) checkedEl.checked = false;
            $('report-detail').value = '';
            showToast('신고가 접수됐습니다. 검토 후 처리됩니다.');
        } catch {
            showToast('신고 처리에 실패했습니다');
        }
    });
}

// ──────────────────────────────────────────
// 댓글 (feed.js와 동일한 엔드포인트 재사용)
// ──────────────────────────────────────────
async function loadComments(postId) {
    try {
        const res = await fetch(`/api/feed/posts/${postId}/comments`);
        if (!res.ok) throw new Error();
        const { comments } = await res.json();
        renderComments(postId, comments);
    } catch {
        renderComments(postId, []);
    }
}

function renderComments(postId, comments) {
    const el = $('detail-comment-list');
    $('detail-comment-count').textContent = comments.length;
    el.innerHTML = '';
    comments.forEach(c => el.appendChild(buildCommentEl(postId, c)));
    el.scrollTop = el.scrollHeight;
}

function buildCommentEl(postId, comment) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-comment-item';

    const isOwn = Boolean(comment.isOwn);
    wrap.innerHTML = `
        <div class="detail-comment-body">
            <span class="detail-comment-username">${escHtml(comment.username)}</span>
            <p class="detail-comment-text">${escHtml(comment.text)}</p>
            <div class="detail-comment-meta">
                <span>${formatTime(comment.createdAt)}</span>
                ${isOwn ? `<button class="detail-comment-delete" data-id="${comment.id}">삭제</button>` : ''}
            </div>
        </div>
    `;
    wrap.querySelector('.detail-comment-delete')?.addEventListener('click', () => deleteComment(postId, comment.id));
    return wrap;
}

async function deleteComment(postId, commentId) {
    try {
        const res = await fetch(`/api/feed/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
        if (res.status === 401) { redirectToLogin(); return; }
        if (!res.ok) throw new Error();
        showToast('댓글이 삭제됐습니다');
        await loadComments(postId);
    } catch {
        showToast('댓글 삭제에 실패했습니다');
    }
}

function initCommentInput() {
    $('detail-comment-submit-btn').addEventListener('click', submitComment);
    $('detail-comment-input').addEventListener('keypress', e => { if (e.key === 'Enter') submitComment(); });
}

async function submitComment() {
    const input = $('detail-comment-input');
    const text = input.value.trim();
    if (!text || !state.currentPost) return;

    try {
        const res = await fetch(`/api/feed/posts/${state.currentPost.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (res.status === 401) { redirectToLogin(); return; }
        if (!res.ok) throw new Error();

        input.value = '';
        await loadComments(state.currentPost.id);
    } catch {
        showToast('댓글 작성에 실패했습니다');
    }
}

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const el = $('community-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2000);
}

function redirectToLogin() {
    showToast('로그인이 필요합니다');
    setTimeout(() => { window.location.href = '/login'; }, 1000);
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(iso).toLocaleDateString('ko-KR');
}

async function loadMyInteractions() {
    try {
        const res = await fetch('/api/feed/my-interactions');
        if (!res.ok) return;
        const { userId, likedIds = [], scrappedIds = [] } = await res.json();
        state.myUserId = Number(userId) || null;
        likedIds.forEach(id => state.likedIds.add(Number(id)));
        scrappedIds.forEach(id => state.scrappedIds.add(Number(id)));
    } catch { /* 비로그인 시 무시 */ }
}

// ──────────────────────────────────────────
// 초기화
// ──────────────────────────────────────────
(async () => {
    renderTopics();
    initSearch();
    initWriteButton();
    initDetailPage();
    initCommentInput();
    await loadMyInteractions();

    // /community?postId=123 으로 들어오면 목록 대신 상세 페이지를 보여준다
    const initialPostId = new URLSearchParams(location.search).get('postId');
    if (initialPostId) {
        openDetail(Number(initialPostId));
    } else {
        loadPosts();
    }
})();
