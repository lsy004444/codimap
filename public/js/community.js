// ──────────────────────────────────────────
// 커뮤니티 (플레이스홀더)
//   화면 구조만 잡아둔 상태. 검색·목록·글쓰기는 아직 서버 연동 전이다.
//
//   TODO: GET  /api/community/posts?topic=&q=&page=  목록 조회
//   TODO: POST /api/community/posts                  글 등록 (사진 포함)
//   ※ DB 는 POST 테이블 재사용 + TOPIC 컬럼 (db/migrations/001_add_post_topic.sql)
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

const state = {
    topic: 'all',
    keyword: '',
};

const $ = id => document.getElementById(id);

// ── 주제 버튼 ──
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
            loadPosts();
        });
    });
}

// ── 목록 (아직 서버 연동 전) ──
function loadPosts() {
    const list = $('community-list');
    if (!list) return;

    const topic = TOPICS.find(t => t.key === state.topic);
    const scope = state.topic === 'all' ? '' : `‘${topic.label}’ 주제에 `;

    list.innerHTML = `
        <div class="community-empty">
            <i class="ti ti-message-circle"></i>
            <p>${scope}아직 글이 없어요</p>
            <span>첫 번째 글을 남겨보세요.</span>
        </div>
    `;
}

// ── 토스트 ──
let toastTimer;
function showToast(msg) {
    const el = $('community-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2000);
}

// ── 검색 (아직 서버 연동 전) ──
function initSearch() {
    const input = $('community-search-input');
    if (!input) return;

    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        state.keyword = input.value.trim();
        showToast('검색은 아직 준비 중이에요');
        loadPosts();
    });
}

// ── 글쓰기 (아직 작성 화면 없음) ──
function initWriteButton() {
    $('community-write-btn')?.addEventListener('click', () => {
        showToast('글쓰기는 아직 준비 중이에요');
    });
}

renderTopics();
initSearch();
initWriteButton();
loadPosts();
