// ──────────────────────────────────────────
// 상태
// ──────────────────────────────────────────
const state = {
    currentRegion: '전국',
    currentSeason: 'spring',
    page: 0,
    pageSize: 9,
    isLoading: false,
    hasMore: true,
    scrappedIds: new Set(JSON.parse(localStorage.getItem('codimap_scraps') || '[]')),
    likedIds: new Set(JSON.parse(localStorage.getItem('codimap_likes') || '[]')), 
    posts: [],           // 로드된 전체 포스트
    currentPost: null,   // 팝업에 열려있는 포스트
    currentSlide: 0,     // 슬라이더 인덱스
    comments: {},        // postId → comment[]
    commentIdSeq: 0,
    likeCounts:  {},     // postId → number
    scrapCounts: {},     // postId → number
};

// ──────────────────────────────────────────
// MOCK DATA
// ──────────────────────────────────────────
const MOCK_USERS = [
    { id: 'u1', username: '@seoultrendz',  avatar: 'https://i.pravatar.cc/80?img=1',  bio: '서울 스트릿 패션' },
    { id: 'u2', username: '@jeju_codi',    avatar: 'https://i.pravatar.cc/80?img=5',  bio: '제주 감성 코디' },
    { id: 'u3', username: '@busan_wave',   avatar: 'https://i.pravatar.cc/80?img=9',  bio: '부산 바다 패션' },
    { id: 'u4', username: '@daegu_style',  avatar: 'https://i.pravatar.cc/80?img=12', bio: '대구 빈티지' },
    { id: 'u5', username: '@gangnam_fit',  avatar: 'https://i.pravatar.cc/80?img=20', bio: '강남 피트 코디' },
    { id: 'u6', username: '@incheon_look', avatar: 'https://i.pravatar.cc/80?img=25', bio: '인천 캐주얼' },
];

const MOCK_SHOPS = [
    [
        { name: 'MUSINSA', item: '오버핏 린넨 셔츠', url: 'https://www.musinsa.com' },
        { name: 'W CONCEPT', item: '와이드 슬랙스', url: 'https://www.wconcept.co.kr' },
    ],
    [
        { name: 'ABLY', item: '플리츠 스커트', url: 'https://m.a-bly.com/' },
        { name: 'ZIG ZAG', item: '크롭 자켓', url: 'https://www.zigzag.kr' },
        { name: 'MUSINSA', item: '화이트 스니커즈', url: 'https://www.musinsa.com' },
    ],
    [
        { name: '29CM', item: '니트 가디건', url: 'https://www.29cm.co.kr' },
    ],
    [
        { name: 'MUSINSA', item: '데님 팬츠', url: 'https://www.musinsa.com' },
        { name: 'W CONCEPT', item: '레이어드 티셔츠', url: 'https://www.wconcept.co.kr' },
    ],
];

const MOCK_DESCS = [
    '오늘의 봄 코디  가볍고 따뜻한 날씨에 딱 맞는 레이어드룩!',
    '여름 감성 가득한 린넨 원피스  시원하고 예쁜 나들이 룩',
    '가을엔 역시 브라운 계열  따뜻한 니트와 와이드 팬츠 조합',
    '겨울 데일리 코디  두꺼운 아우터 없어도 레이어드로 완성',
    '캐주얼하게 입기 좋은 봄 스트릿 룩  심플하지만 포인트 있어요',
    '트렌디한 Y2K 감성 코디  친구들한테 어디서 샀냐고 물어봤대요',
];

function generateMockPosts(count, offset) {
    const posts = [];
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    for (let i = 0; i < count; i++) {
        const id = `post_${offset + i}`;
        const user = MOCK_USERS[(offset + i) % MOCK_USERS.length];
        const imgCount = Math.random() > 0.55 ? Math.floor(Math.random() * 3) + 2 : 1;
        const images = Array.from({ length: imgCount }, (_, k) =>
            `https://picsum.photos/seed/${id}_${k}/600/800`
        );
        posts.push({
            id,
            user,
            images,
            season: seasons[(offset + i) % 4],
            region: state.currentRegion,
            desc: MOCK_DESCS[(offset + i) % MOCK_DESCS.length],
            shops: MOCK_SHOPS[(offset + i) % MOCK_SHOPS.length],
            createdAt: new Date(Date.now() - (offset + i) * 3600000 * 5).toISOString(),
            likeCount:  Math.floor(Math.random() * 120),
            scrapCount: Math.floor(Math.random() * 60),
        });
    }
    return posts;
}

// ──────────────────────────────────────────
// DOM 참조
// ──────────────────────────────────────────
const $ = id => document.getElementById(id);
const feedGrid      = $('feed-grid');
const sentinel      = $('feed-sentinel');
const postOverlay   = $('post-overlay');
const reportOverlay = $('report-overlay');
const toast         = $('toast');

// ──────────────────────────────────────────
// 무한 스크롤 (IntersectionObserver)
// ──────────────────────────────────────────
let observer = null;

function initInfiniteScroll() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !state.isLoading && state.hasMore) {
            loadMorePosts();
        }
    }, { rootMargin: '200px' });
    if (sentinel) observer.observe(sentinel);
}

async function loadMorePosts() {
    state.isLoading = true;
    sentinel.style.visibility = 'visible';

    await new Promise(r => setTimeout(r, 700)); 

    const TOTAL = 45;
    const newPosts = generateMockPosts(
        Math.min(state.pageSize, TOTAL - state.posts.length),
        state.posts.length
    );
    state.hasMore = state.posts.length + newPosts.length < TOTAL;
    state.page++;
    state.posts.push(...newPosts);

    newPosts.forEach(p => {
        if (!(p.id in state.likeCounts))  state.likeCounts[p.id]  = p.likeCount;
        if (!(p.id in state.scrapCounts)) state.scrapCounts[p.id] = p.scrapCount;
    });

    renderCards(newPosts);

    state.isLoading = false;
    if (!state.hasMore) sentinel.style.visibility = 'hidden';
}

// ──────────────────────────────────────────
// 피드 카드 렌더링
// ──────────────────────────────────────────
function renderCards(posts) {
    posts.forEach((post, i) => {
        const card = document.createElement('div');
        card.className = 'feed-card';
        card.style.animationDelay = `${i * 0.045}s`;
        if (state.scrappedIds.has(post.id)) card.classList.add('scrapped');

        card.innerHTML = `
            <img src="${post.images[0]}" alt="코디 사진" loading="lazy">
            ${post.images.length > 1 ? `<div class="feed-card-multi">📷 ${post.images.length}</div>` : ''}
            <div class="feed-card-scrap-badge" data-id="${post.id}">
                <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="feed-card-overlay">
                <div class="feed-card-user">${post.user.username}</div>
                <div class="feed-card-region">${post.region} · ${seasonName(post.season)}</div>
            </div>
        `;

        card.addEventListener('click', e => {
            if (e.target.closest('.feed-card-scrap-badge')) {
                e.stopPropagation();
                toggleScrap(post.id, card);
                return;
            }
            openPostModal(post);
        });

        feedGrid.appendChild(card);
    });

    $('feed-count-num').textContent = state.posts.length;
}

// ──────────────────────────────────────────
// 피드 초기화 (지역/계절 변경 시)
// ──────────────────────────────────────────
function resetFeed(region, season) {
    state.currentRegion = region || state.currentRegion;
    state.currentSeason = season || state.currentSeason;
    state.page = 0;
    state.hasMore = true;
    state.posts = [];
    feedGrid.innerHTML = '';
    $('feed-region-label').textContent = state.currentRegion;
    $('feed-season-label').textContent = seasonName(state.currentSeason);
    document.body.dataset.season = state.currentSeason;
    loadMorePosts();
}

// ──────────────────────────────────────────
// 스크랩 토글
// ──────────────────────────────────────────
function toggleScrap(postId, cardEl) {
    const isScrapped = state.scrappedIds.has(postId);

    if (isScrapped) {
        state.scrappedIds.delete(postId);
        cardEl?.classList.remove('scrapped');
        $('scrap-btn')?.classList.remove('active');
        state.scrapCounts[postId] = Math.max(0, (state.scrapCounts[postId] || 0) - 1);
        showToast('스크랩이 취소됐습니다');
    } else {
        state.scrappedIds.add(postId);
        cardEl?.classList.add('scrapped');
        $('scrap-btn')?.classList.add('active');
        state.scrapCounts[postId] = (state.scrapCounts[postId] || 0) + 1;
        showToast('스크랩에 저장했습니다');
    }

    localStorage.setItem('codimap_scraps', JSON.stringify([...state.scrappedIds]));

    if (state.currentPost?.id === postId) {
        $('scrap-count').textContent = state.scrapCounts[postId];
    }
}

// ──────────────────────────────────────────
// 좋아요 토글
// ──────────────────────────────────────────
function toggleLike(postId) {
    const likeBtn = $('like-btn');
    const isLiked = state.likedIds.has(postId);

    if (isLiked) {
        state.likedIds.delete(postId);
        likeBtn.classList.remove('active');
        state.likeCounts[postId] = Math.max(0, (state.likeCounts[postId] || 0) - 1);   
    } else {
        state.likedIds.add(postId);
        likeBtn.classList.add('active');
        state.likeCounts[postId] = (state.likeCounts[postId] || 0) + 1;
    }

    localStorage.setItem('codimap_likes', JSON.stringify([...state.likedIds]));
    $('like-count').textContent = state.likeCounts[postId];
}

// ──────────────────────────────────────────
// 게시물 상세 팝업
// ──────────────────────────────────────────
function openPostModal(post) {
    state.currentPost = post;
    state.currentSlide = 0;

    // 슬라이더 구성
    const slider = $('modal-slider');
    slider.innerHTML = post.images.map(src =>
        `<div class="modal-slide"><img src="${src}" alt="코디"></div>`
    ).join('');
    slider.style.transform = 'translateX(0)';


    const dotsEl = $('slider-dots');
    dotsEl.innerHTML = post.images.map((_, i) =>
        `<div class="slider-dot ${i === 0 ? 'active' : ''}" data-i="${i}"></div>`
    ).join('');
    dotsEl.querySelectorAll('.slider-dot').forEach(d =>
        d.addEventListener('click', () => goSlide(+d.dataset.i))
    );

    updateSliderArrows();

    // 유저
    $('modal-avatar').style.backgroundImage = `url('${post.user.avatar}')`;
    $('modal-username').textContent = post.user.username;
    $('modal-user-region').textContent = `${post.region} · ${seasonName(post.season)}`;

    // 좋아요 버튼 상태 및 카운트
    const likeBtn = $('like-btn');
    likeBtn.classList.toggle('active', state.likedIds.has(post.id));
    // 팝업 열 때 like-count 레이블에 현재 좋아요 수 표시
    $('like-count').textContent = state.likeCounts[post.id] ?? post.likeCount;

    // 스크랩 버튼 상태 및 카운트
    const scrapBtn = $('scrap-btn');
    scrapBtn.classList.toggle('active', state.scrappedIds.has(post.id));
    // 팝업 열 때 scrap-count 레이블에 현재 스크랩 수 표시
    $('scrap-count').textContent = state.scrapCounts[post.id] ?? post.scrapCount;

    // 설명
    $('modal-desc').textContent = post.desc;

    // 쇼핑 링크
    const shopEl = $('modal-shop-links');
    shopEl.innerHTML = post.shops.map(s => `
        <a class="shop-link-btn" href="${s.url}" target="_blank" rel="noopener">
            <span class="shop-link-icon">🛒</span>
            <span class="shop-link-name">${s.name}</span>
            <span class="shop-link-item">${s.item}</span>
            <span class="shop-link-arrow">↗</span>
        </a>
    `).join('');

    // 댓글
    renderComments(post.id);

    postOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closePostModal() {
    postOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    state.currentPost = null;
}

// ── 슬라이더 ──
function goSlide(idx) {
    const post = state.currentPost;
    if (!post) return;
    idx = Math.max(0, Math.min(idx, post.images.length - 1));
    state.currentSlide = idx;
    $('modal-slider').style.transform = `translateX(-${idx * 100}%)`;
    document.querySelectorAll('.slider-dot').forEach((d, i) =>
        d.classList.toggle('active', i === idx)
    );
    updateSliderArrows();
}

function updateSliderArrows() {
    const post = state.currentPost;
    if (!post) return;
    $('slider-prev').classList.toggle('hidden', state.currentSlide === 0);
    $('slider-next').classList.toggle('hidden', state.currentSlide >= post.images.length - 1);
}

$('slider-prev').addEventListener('click', () => goSlide(state.currentSlide - 1));
$('slider-next').addEventListener('click', () => goSlide(state.currentSlide + 1));
$('modal-close-btn').addEventListener('click', closePostModal);
postOverlay.addEventListener('click', e => { if (e.target === postOverlay) closePostModal(); });

// 좋아요 버튼 (팝업 내)
$('like-btn').addEventListener('click', () => {
    if (!state.currentPost) return;
    toggleLike(state.currentPost.id);
});

// 스크랩 버튼 (팝업 내)
$('scrap-btn').addEventListener('click', () => {
    if (!state.currentPost) return;
    const card = feedGrid.querySelector(`.feed-card-scrap-badge[data-id="${state.currentPost.id}"]`)?.closest('.feed-card');
    toggleScrap(state.currentPost.id, card);
});


// 댓글 

function renderComments(postId) {
    const list = state.comments[postId] || [];
    const el   = $('comment-list');
    $('comment-count').textContent = list.length;
    el.innerHTML = '';
    list.forEach(c => el.appendChild(buildCommentEl(postId, c)));
    el.scrollTop = el.scrollHeight;
}

function buildCommentEl(postId, comment) {
    const wrap = document.createElement('div');
    wrap.className = 'comment-item';
    wrap.dataset.id = comment.id;

    const meUser = '@나'; // 테스트용. 실제 로그인 유저 ID로 교체
    const isOwn = comment.username === meUser;

    wrap.innerHTML = `
        <div class="comment-avatar" style="background-image:url('${comment.avatar}')"></div>
        <div class="comment-body">
            <span class="comment-username">${comment.username}</span>
            <p class="comment-text">${escHtml(comment.text)}</p>
            <div class="comment-meta">
                <span class="comment-time">${formatTime(comment.createdAt)}</span>
                ${isOwn ? `
                    <button class="comment-edit-btn"   data-id="${comment.id}">수정</button>
                    <button class="comment-delete-btn" data-id="${comment.id}">삭제</button>
                ` : ''}
            </div>
        </div>
    `;

    // 수정
    wrap.querySelector('.comment-edit-btn')?.addEventListener('click', () => {
        startEditComment(postId, comment, wrap);
    });
    // 삭제
    wrap.querySelector('.comment-delete-btn')?.addEventListener('click', () => {
        deleteComment(postId, comment.id);
    });

    return wrap;
}

function startEditComment(postId, comment, wrapEl) {
    const bodyEl = wrapEl.querySelector('.comment-body');
    bodyEl.innerHTML = `
        <div class="comment-edit-form">
            <input class="comment-edit-input" type="text" value="${escHtml(comment.text)}" maxlength="200">
            <button class="comment-edit-save">저장</button>
            <button class="comment-edit-cancel">취소</button>
        </div>
    `;
    const input = bodyEl.querySelector('.comment-edit-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    bodyEl.querySelector('.comment-edit-save').addEventListener('click', () => {
        const newText = input.value.trim();
        if (!newText) return;
        comment.text = newText;
        comment.updatedAt = new Date().toISOString();
        renderComments(postId);
        showToast('댓글이 수정됐습니다');
    });
    bodyEl.querySelector('.comment-edit-cancel').addEventListener('click', () => {
        renderComments(postId);
    });
}

function deleteComment(postId, commentId) {
    state.comments[postId] = (state.comments[postId] || []).filter(c => c.id !== commentId);
    renderComments(postId);
    showToast('댓글이 삭제됐습니다');
}

$('comment-submit-btn').addEventListener('click', submitComment);
$('comment-input').addEventListener('keypress', e => { if (e.key === 'Enter') submitComment(); });

function submitComment() {
    const input = $('comment-input');
    const text  = input.value.trim();
    if (!text || !state.currentPost) return;

    const newComment = {
        id: `c_${++state.commentIdSeq}`,
        postId: state.currentPost.id,
        username: '@나',
        avatar: 'https://i.pravatar.cc/80?img=50',
        text,
        createdAt: new Date().toISOString(),
    };

    if (!state.comments[state.currentPost.id]) state.comments[state.currentPost.id] = [];
    state.comments[state.currentPost.id].push(newComment);
    input.value = '';
    renderComments(state.currentPost.id);
}


// 신고 팝업

$('report-btn').addEventListener('click', () => {
    reportOverlay.classList.remove('hidden');
});
$('report-cancel-btn').addEventListener('click', () => {
    reportOverlay.classList.add('hidden');
});
reportOverlay.addEventListener('click', e => {
    if (e.target === reportOverlay) reportOverlay.classList.add('hidden');
});
$('report-submit-btn').addEventListener('click', () => {
    const reason = document.querySelector('input[name="report-reason"]:checked')?.value;
    if (!reason) { showToast('신고 사유를 선택해 주세요'); return; }
    const detail = $('report-detail').value.trim();


    reportOverlay.classList.add('hidden');
    document.querySelector('input[name="report-reason"]:checked').checked = false;
    $('report-detail').value = '';
    showToast('신고가 접수됐습니다. 검토 후 처리됩니다.');
});


// 지도에서 지역을 클릭하거나 계절을 바꿀 때 호출할 함수
window.feedUpdateFilter = function(region, seasonId) {
    console.log(`필터 변경 수신: ${region}, ${seasonId}`);
    resetFeed(region, seasonId);
    
    // 페이지 최상단으로 스크롤 이동 
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function seasonName(id) {
    return { spring:'봄', summer:'여름', fall:'가을', winter:'겨울' }[id] || id;
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)   return '방금 전';
    if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
    if (diff < 86400)return `${Math.floor(diff/3600)}시간 전`;
    return new Date(iso).toLocaleDateString('ko-KR');
}

// ──────────────────────────────────────────
// 초기화 
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 1. URL 파라미터에서 부모창이 보낸 데이터 추출
    const urlParams = new URLSearchParams(window.location.search);
    const region = urlParams.get('region'); // map.js에서 넘긴 값
    const season = urlParams.get('season'); // map.js에서 넘긴 값

    // 2. 전달된 데이터가 있으면 해당 데이터로, 없으면 기본값으로 시작
    const initialRegion = region ? decodeURIComponent(region) : '전국';
    const initialSeason = season || 'spring';

    // 3. 앱 상태 초기화 및 피드 로드
    initInfiniteScroll();
    resetFeed(initialRegion, initialSeason);
});
