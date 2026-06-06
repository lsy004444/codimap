// ──────────────────────────────────────────
// 상태
// ──────────────────────────────────────────
const state = {
    currentRegion: '전국',
    currentSeason: 'spring',
    currentLat: null,
    currentLng: null,
    addressType: 'dong',
    currentGu: null,
    currentCity: null,
    page: 0,
    pageSize: 9,
    isLoading: false,
    hasMore: true,
    myUserId: null,
    scrappedIds: new Set(),
    likedIds: new Set(),
    followingIds: new Set(),
    posts: [],
    currentPost: null,
    currentSlide: 0,
};

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

// async function loadMorePosts() {
//     state.isLoading = true;
//     sentinel.style.visibility = 'visible';

//     try {
//         const params = new URLSearchParams({
//             page: state.page,
//             size: state.pageSize,
//         });
//         if (state.currentRegion && state.currentRegion !== '전국') params.set('region', state.currentRegion);
//         if (state.currentSeason) params.set('season', state.currentSeason);

//         const res = await fetch(`/api/feed/posts?${params}`);
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const { posts: newPosts, total } = await res.json();

//         state.hasMore = state.posts.length + newPosts.length < total;
//         state.page++;
//         state.posts.push(...newPosts);

//         renderCards(newPosts);
//         $('feed-count-num').textContent = total;
//     } catch (err) {
//         console.error('게시물 로드 실패:', err);
//         showToast('게시물을 불러오지 못했습니다');
//     }

//     state.isLoading = false;
//     if (!state.hasMore) sentinel.style.visibility = 'hidden';
// }

//loadmoreposts 수정버전
async function loadMorePosts() {
    state.isLoading = true;
    sentinel.style.visibility = 'visible';

    try {
        if(state.currentLat && state.currentLng) {
            let url;
            if(state.currentGu) {
                url = `/api/regions/nearby?gu=${encodeURIComponent(state.currentGu)}&season=${state.currentSeason}`;
            } else if (state.currentCity){
                url = `/api/regions/nearby?city=${encodeURIComponent(state.currentCity)}&season=${state.currentSeason}`;
            } else {
            
                url = `/api/regions/nearby?lat=${state.currentLat}&lng=${state.currentLng}&season=${state.currentSeason}&type=${state.addressType}`;
            }
            const res = await fetch(url);
            console.log('API 응답 상태: ', res.status, url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const newPosts = data.map(p => ({
                id: p.POST_ID,
                desc: p.CONTENT,
                region: p.REGION_NAME,
                season: p.SEASON,
                viewCount: p.VIEW_COUNT || 0,
                scrapCount: p.SCRAP_COUNT || 0,
                likeCount: p.LIKE_COUNT || 0,
                user: { id: p.MEMBER_ID, username: p.NAME ? '@' + p.NAME : '@user', profileId: p.PROFILE_ID, avatar: '' },
                images: p.IMAGE_URLS ? p.IMAGE_URLS.split('||') : [],
                isFollowing: Boolean(p.IS_FOLLOWING),
                hasAffiliate: Boolean(p.HAS_AFFILIATE),
                shops: p.LINK_URLS
                    ? p.LINK_URLS.split('||').map((url, index) => ({
                        name: `링크 ${index + 1}`,
                        item: url,
                        url,
                    }))
                    : [],
            }));
            state.hasMore = false;
            state.posts.push(...newPosts);
            renderCards(newPosts);
            $('feed-count-num').textContent = newPosts.length;
        } else {
            const params = new URLSearchParams({
                page: state.page,
                size: state.pageSize,
            });
            if (state.currentRegion && state.currentRegion !== '전국') params.set('region', state.currentRegion);
            if (state.currentSeason) params.set('season', state.currentSeason);

            const res = await fetch(`/api/feed/posts?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { posts: newPosts, total } = await res.json();

            state.hasMore = state.posts.length + newPosts.length < total;
            state.page++;
            state.posts.push(...newPosts);
            renderCards(newPosts);
            $('feed-count-num').textContent = total;
        }
    } catch (err) {
        console.error('게시물 로드 실패:', err);
        showToast('게시물을 불러오지 못했습니다');
    }

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
            <img src="${post.images[0] || ''}" alt="코디 사진" loading="lazy">
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
// 스크랩 토글 (API 연동, 중복 확인은 서버에서)
// ──────────────────────────────────────────
async function toggleScrap(postId, cardEl) {
    try {
        const res = await fetch(`/api/feed/posts/${postId}/scrap`, { method: 'POST' });
        if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
        if (!res.ok) throw new Error();

        const { scrapped, scrapCount } = await res.json();

        if (scrapped) {
            state.scrappedIds.add(postId);
            cardEl?.classList.add('scrapped');
            $('scrap-btn')?.classList.add('active');
            showToast('스크랩에 저장했습니다');
        } else {
            state.scrappedIds.delete(postId);
            cardEl?.classList.remove('scrapped');
            $('scrap-btn')?.classList.remove('active');
            showToast('스크랩이 취소됐습니다');
        }
        if (state.currentPost?.id === postId) {
            $('scrap-count').textContent = scrapCount;
        }
    } catch {
        showToast('스크랩 처리에 실패했습니다');
    }
}

// ──────────────────────────────────────────
// 좋아요 토글 (API 연동)
// ──────────────────────────────────────────
async function toggleLike(postId) {
    try {
        const res = await fetch(`/api/feed/posts/${postId}/like`, { method: 'POST' });
        if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
        if (!res.ok) throw new Error();

        const { liked, likeCount } = await res.json();
        const likeBtn = $('like-btn');

        if (liked) {
            state.likedIds.add(postId);
            likeBtn.classList.add('active');
        } else {
            state.likedIds.delete(postId);
            likeBtn.classList.remove('active');
        }
        $('like-count').textContent = likeCount;
    } catch {
        showToast('좋아요 처리에 실패했습니다');
    }
}

// ──────────────────────────────────────────
// 게시물 상세 팝업
// ──────────────────────────────────────────
function openPostModal(post) {
    state.currentPost = post;
    state.currentSlide = 0;

    // 슬라이더
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

    // 유저 프로필 — 클릭 시 해당 작성자의 마이페이지로 이동
    const avatarEl   = $('modal-avatar');
    const usernameEl = $('modal-username');
    avatarEl.style.backgroundImage = `url('${post.user.avatar}')`;
    usernameEl.textContent = post.user.username;
    $('modal-user-region').textContent = `${post.region} · ${seasonName(post.season)}`;

    const goToProfile = () => { window.location.href = `/mypage?profileId=${post.user.profileId}`; };
    avatarEl.style.cursor   = 'pointer';
    usernameEl.style.cursor = 'pointer';
    avatarEl.onclick   = goToProfile;
    usernameEl.onclick = goToProfile;

    // 팔로우 버튼
    const followBtn = $('follow-btn');
    const isOwnPost = state.myUserId && post.user.id === state.myUserId;
    if (!state.myUserId || isOwnPost) {
        followBtn.classList.add('hidden');
    } else {
        followBtn.classList.remove('hidden');
        const isFollowing = state.followingIds.has(Number(post.user.id)) || Boolean(post.isFollowing);
        if (isFollowing) state.followingIds.add(Number(post.user.id));
        followBtn.textContent = isFollowing ? '팔로잉' : '팔로우';
        followBtn.classList.toggle('following', isFollowing);
    }

    // 좋아요 / 스크랩 상태
    $('like-btn').classList.toggle('active', state.likedIds.has(post.id));
    $('like-count').textContent  = post.likeCount;
    $('scrap-btn').classList.toggle('active', state.scrappedIds.has(post.id));
    $('scrap-count').textContent = post.scrapCount;

    // 설명
    $('modal-desc').textContent = post.desc;
    const affiliateNotice = $('affiliate-notice');
    if (post.hasAffiliate) {
        affiliateNotice.classList.remove('hidden');
    } else {
        affiliateNotice.classList.add('hidden');
    }

    // 쇼핑 링크
    const shopEl = $('modal-shop-links');
    const shops = post.shops || [];
    shopEl.innerHTML = shops.map((s, i) => {
        let hostname = s.url;
        try { hostname = new URL(s.url).hostname; } catch { /* ignore */ }
        return `
        <a class="og-preview-card" href="${escHtml(s.url)}" target="_blank" rel="noopener" data-og="${i}">
            <div class="og-preview-thumb">🛒</div>
            <div class="og-preview-content">
                <div class="og-preview-title">${escHtml(hostname)}</div>
                <div class="og-preview-desc"></div>
                <div class="og-preview-domain">${escHtml(hostname)} ↗</div>
            </div>
        </a>`;
    }).join('');

    const currentPostId = post.id;
    shops.forEach((s, i) => {
        fetch(`/api/feed/og-preview?url=${encodeURIComponent(s.url)}`)
            .then(r => r.ok ? r.json() : null)
            .then(og => {
                if (!og || state.currentPost?.id !== currentPostId) return;
                const card = shopEl.querySelector(`[data-og="${i}"]`);
                if (!card) return;
                if (og.title) card.querySelector('.og-preview-title').textContent = og.title;
                if (og.description) card.querySelector('.og-preview-desc').textContent = og.description;
                if (og.image) {
                    const thumb = card.querySelector('.og-preview-thumb');
                    thumb.style.backgroundImage = `url('${og.image}')`;
                    thumb.textContent = '';
                    thumb.classList.add('has-image');
                }
            })
            .catch(() => {});
    });

    // 댓글 로드
    loadComments(post.id);

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

$('like-btn').addEventListener('click', () => {
    if (!state.currentPost) return;
    toggleLike(state.currentPost.id);
});

$('scrap-btn').addEventListener('click', () => {
    if (!state.currentPost) return;
    const card = feedGrid.querySelector(`.feed-card-scrap-badge[data-id="${state.currentPost.id}"]`)?.closest('.feed-card');
    toggleScrap(state.currentPost.id, card);
});

$('follow-btn').addEventListener('click', async () => {
    const post = state.currentPost;
    if (!post) return;
    try {
        const res = await fetch(`/api/feed/users/${post.user.id}/follow`, { method: 'POST' });
        if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
        if (!res.ok) throw new Error();
        const { followed } = await res.json();
        const btn = $('follow-btn');
        if (followed) {
            state.followingIds.add(Number(post.user.id));
            btn.textContent = '팔로잉';
            btn.classList.add('following');
            showToast('팔로우했습니다');
        } else {
            state.followingIds.delete(Number(post.user.id));
            btn.textContent = '팔로우';
            btn.classList.remove('following');
            showToast('팔로우를 취소했습니다');
        }
    } catch {
        showToast('처리에 실패했습니다');
    }
});

// ──────────────────────────────────────────
// 댓글 (API 연동)
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
    const el = $('comment-list');
    $('comment-count').textContent = comments.length;
    el.innerHTML = '';
    comments.forEach(c => el.appendChild(buildCommentEl(postId, c)));
    el.scrollTop = el.scrollHeight;
}

function buildCommentEl(postId, comment) {
    const wrap = document.createElement('div');
    wrap.className = 'comment-item';
    wrap.dataset.id = comment.id;

    const isOwn = Boolean(comment.isOwn);

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

    wrap.querySelector('.comment-edit-btn')?.addEventListener('click', () => {
        startEditComment(postId, comment, wrap);
    });
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

    bodyEl.querySelector('.comment-edit-save').addEventListener('click', async () => {
        const newText = input.value.trim();
        if (!newText) return;
        try {
            const res = await fetch(`/api/feed/posts/${postId}/comments/${comment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newText }),
            });
            if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
            if (!res.ok) throw new Error();
            showToast('댓글이 수정됐습니다');
            await loadComments(postId);
        } catch {
            showToast('댓글 수정에 실패했습니다');
        }
    });
    bodyEl.querySelector('.comment-edit-cancel').addEventListener('click', () => {
        loadComments(postId);
    });
}

async function deleteComment(postId, commentId) {
    try {
        const res = await fetch(`/api/feed/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
        if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
        if (!res.ok) throw new Error();
        showToast('댓글이 삭제됐습니다');
        await loadComments(postId);
    } catch {
        showToast('댓글 삭제에 실패했습니다');
    }
}

$('comment-submit-btn').addEventListener('click', submitComment);
$('comment-input').addEventListener('keypress', e => { if (e.key === 'Enter') submitComment(); });

async function submitComment() {
    const input = $('comment-input');
    const text  = input.value.trim();
    if (!text || !state.currentPost) return;

    try {
        const res = await fetch(`/api/feed/posts/${state.currentPost.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (res.status === 401) { showToast('로그인이 필요합니다'); return; }
        if (!res.ok) throw new Error();

        input.value = '';
        await loadComments(state.currentPost.id);
    } catch {
        showToast('댓글 작성에 실패했습니다');
    }
}

// ──────────────────────────────────────────
// 신고 팝업 (API 연동)
// ──────────────────────────────────────────
$('report-btn').addEventListener('click', () => {
    reportOverlay.classList.remove('hidden');
});
$('report-cancel-btn').addEventListener('click', () => {
    reportOverlay.classList.add('hidden');
});
reportOverlay.addEventListener('click', e => {
    if (e.target === reportOverlay) reportOverlay.classList.add('hidden');
});
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
        if (res.status === 401) {
            showToast('로그인이 필요합니다');
            reportOverlay.classList.add('hidden');
            return;
        }
        if (res.status === 409) {
            showToast('이미 신고한 게시물입니다');
            reportOverlay.classList.add('hidden');
            return;
        }
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

// ──────────────────────────────────────────
// 지도에서 지역/계절 변경 시 호출
// ──────────────────────────────────────────
window.feedUpdateFilter = function(region, seasonId) {
    resetFeed(region, seasonId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ──────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────
function seasonName(id) {
    return { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }[id] || id;
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add('hidden'), 2500);
}

function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return '방금 전';
    if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(iso).toLocaleDateString('ko-KR');
}

// ──────────────────────────────────────────
// 내 좋아요·스크랩 초기 로드
// ──────────────────────────────────────────
async function loadMyInteractions() {
    try {
        const res = await fetch('/api/feed/my-interactions');
        if (!res.ok) return;
        const { userId, likedIds = [], scrappedIds = [], followingIds = [] } = await res.json();
        state.myUserId = Number(userId) || null;
        likedIds.forEach(id => state.likedIds.add(Number(id)));
        scrappedIds.forEach(id => state.scrappedIds.add(Number(id)));
        followingIds.forEach(id => state.followingIds.add(Number(id)));
    } catch { /* 비로그인 시 무시 */ }
}

// ──────────────────────────────────────────
// 초기화
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const region = urlParams.get('region');
    const season = urlParams.get('season');
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const type = urlParams.get('type') || 'dong';
    const gu = urlParams.get('gu');
    const city = urlParams.get('city');

    state.currentLat = lat ? parseFloat(lat) : null;
    state.currentLng = lng ? parseFloat(lng) : null;

    state.addressType = type;
    state.currentGu = gu ? decodeURIComponent(gu) : null;
    state.currentCity = city ? decodeURIComponent(city) : null;

    const initialRegion = region ? decodeURIComponent(region) : '전국';
    const initialSeason = season || 'spring';

    await loadMyInteractions();   // 카드 렌더링 전에 상태 복원
    initInfiniteScroll();
    resetFeed(initialRegion, initialSeason);
});
