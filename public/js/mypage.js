//const { response } = require("express");

// 탭을 눌렀을 경우 발생하는 이벤트

if (!window.showToast) {
            window.showToast = function(message) {
                const toast = document.createElement('div');
                toast.className = 'upload-toast';
                toast.textContent = message;
                toast.style = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:10px 20px; border-radius:5px; z-index:10000; transition:all 0.3s;";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            }
        }

function openTab(event, tabId) {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // 초기에 선택되어 있던 탭 강조 표시 지움
    tabItems.forEach(item => {
        item.classList.remove('active');
    });

    // 초기에 선택되어 있던 탭의 내용 지움
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // 현재 선택한 탭에 강조 및 선택한 탭에 해당하는 내용 표시
    event.currentTarget.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function escapeHTML(value) {
    if(value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function getFirstImage(IMAGE_URLS) {
    if(!IMAGE_URLS) return null;
    return IMAGE_URLS.split("||")[0];
}

// 💥 [수정] 게시물 카드 생성 시, 내 게시물 목록 탭일 때만 상세 모달창이 열리도록 변경합니다.
function renderPostCard(post, isMyPostTab = false) {
    const imageUrl = getFirstImage(post.IMAGE_URLS);
    const content = escapeHTML(post.CONTENT || "");

    // 내 게시물 탭에서 띄운 카드라면 openDetailModal 실행, 스크랩 탭 등 다른 곳은 기존대로 피드로 이동합니다.
    const clickEvent = isMyPostTab 
        ? `window.openDetailModal('${post.POST_ID}')` 
        : `location.href='/feed?postId=${post.POST_ID}'`;

    return `
        <div class="grid post-card" onclick="${clickEvent}" style="cursor:pointer;">
            ${
                imageUrl
                    ? `<img src="${escapeHTML(imageUrl)}" alt="게시물 이미지">`
                    : `<div class="empty-image">이미지 없음</div>`
            }

            <div class="post-info">
                <p>${content}</p>
                <small>좋아요 ${post.LIKE_COUNT || 0}, 스크랩 ${post.SCRAP_COUNT || 0}</small>
            </div>
        </div>
    `;
}

async function loadScraps(profileId) {
    const scrapList = document.getElementById("scrapList");
    if(!scrapList) return;

    try {
        const response = await fetch(`/api/mypage/${encodeURIComponent(profileId)}/scraps`);
        const result = await response.json();

        if(!result.success) {
            scrapList.innerHTML = `<p class="empty-message">${escapeHTML(result.message)}</p>`;
            return;
        }

        if(result.scraps.length === 0) {
            scrapList.innerHTML = `<p class="empty-message">스크랩한 게시물이 없습니다.</p>`;
            return;
        }

        // 스크랩 탭은 기존 이동 방식 유지
        scrapList.innerHTML = result.scraps.map(post => renderPostCard(post, false)).join("");
    } catch (error) {
        console.error(error);
        scrapList.innerHTML = `<p class="empty-message">스크랩 목록을 불러오지 못했습니다.</p>`;
    }
}

async function loadFollows(profileId) {
    const followList = document.getElementById("followList");
    if(!followList) return;

    try {
        const response = await fetch(`/api/mypage/${encodeURIComponent(profileId)}/follows`);
        const result = await response.json();

        if (!result.success) {
            followList.innerHTML = `<p class="empty-message">${escapeHTML(result.message)}</p>`;
            return;
        }

        const followersHTML = result.followers.length === 0
            ? `<p class="empty-message">팔로워가 없습니다.</p>`
            : result.followers.map(user => `
                <div class="follow" onclick="location.href='/mypage?profileId=${encodeURIComponent(user.ID)}'">
                    <strong>@${escapeHTML(user.ID)}</strong>
                    <span>${escapeHTML(user.NAME || "")}</span>
                </div>
            `).join("");

        const followingsHTML = result.followings.length === 0
            ? `<p class="empty-message">팔로잉한 사용자가 없습니다.</p>`
            : result.followings.map(user => `
                <div class="follow" onclick="location.href='/mypage?profileId=${encodeURIComponent(user.ID)}'">
                    <strong>@${escapeHTML(user.ID)}</strong>
                    <span>${escapeHTML(user.NAME || "")}</span>
                </div>
            `).join("");

        followList.innerHTML = `
            <div class="follow-section">
                <h3>팔로워</h3>
                ${followersHTML}
            </div>

            <div class="follow-section">
                <h3>팔로잉</h3>
                ${followingsHTML}
            </div>
        `;

    } catch (error) {
        console.error(error);
        followList.innerHTML = `<p class="empty-message">팔로우 목록을 불러오지 못했습니다.</p>`;
    }
}

async function loadPosts(profileId) {
    const postList = document.getElementById("postList");
    if (!postList) return;

    try {
        const response = await fetch(`/api/mypage/${encodeURIComponent(profileId)}/posts`);
        const result = await response.json();

        if (!result.success) {
            postList.innerHTML = `<p class="empty-message">${escapeHTML(result.message)}</p>`;
            return;
        }

        if (result.posts.length === 0) {
            postList.innerHTML = `<p class="empty-message">작성한 게시물이 없습니다.</p>`;
            return;
        }

        // 💥 [수정] 내 게시물 탭이므로 True 인자값을 넘겨 모달이 열리도록 매핑합니다.
        postList.innerHTML = result.posts.map(post => renderPostCard(post, true)).join("");

    } catch (error) {
        console.error(error);
        postList.innerHTML = `<p class="empty-message">게시물을 불러오지 못했습니다.</p>`;
    }
}

async function loadComments(profileId) {
    const commentList = document.getElementById("commentList");
    if (!commentList) return;

    try {
        const response = await fetch(`/api/mypage/${encodeURIComponent(profileId)}/comments`);
        const result = await response.json();

        if (!result.success) {
            commentList.innerHTML = `<p class="empty-message">${escapeHTML(result.message)}</p>`;
            return;
        }

        if (result.comments.length === 0) {
            commentList.innerHTML = `<p class="empty-message">작성한 댓글이 없습니다.</p>`;
            return;
        }

        commentList.innerHTML = result.comments.map(comment => `
            <div class="comment" onclick="location.href='/feed?postId=${comment.POST_ID}'">
                <p>${escapeHTML(comment.COMMENT_CONTENT)}</p>
                <small>게시물: ${escapeHTML(comment.POST_CONTENT || "내용 없음")}</small>
            </div>
        `).join("");

    } catch (error) {
        console.error(error);
        commentList.innerHTML = `<p class="empty-message">댓글을 불러오지 못했습니다.</p>`;
    }
}

// 🟢 [추가] 마이페이지 내 게시물 전용 모달 상세 열기 로직
window.openDetailModal = async function(postId) {
    try {
        // 서버에서 단건 상세 코디맵 정보 가져오기
        const response = await fetch(`/api/outfit/detail/${postId}`);
        const data = await response.json();
        
        if (!data.success || !data.post) {
            window.showToast('⚠️ 게시물 정보를 가져오지 못했습니다.');
            return;
        }

        const post = data.post;


        const modalOverlay = document.getElementById('uploadModalOverlay');
        if(modalOverlay) modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';


        const previewList = document.getElementById('previewList');
        if (previewList) {
            previewList.innerHTML = '';
            if (post.IMAGE_URLS) {
                const images = post.IMAGE_URLS.split('||');
                images.forEach((imgUrl, idx) => {
                    const item = document.createElement('div');
                    item.className = 'preview-item';
                    item.innerHTML = `
                        <img src="${escapeHTML(imgUrl)}" alt="preview-${idx}" />
                        ${idx === 0 ? '<div class="badge-rep">대표</div>' : ''}
                    `;
                    previewList.appendChild(item);
                });
            }
        }


        const metaBox = document.getElementById('metaBox');
        const metaTags = document.getElementById('metaTags');
        if (metaBox && metaTags) {
            if (post.LOCATION || post.SEASON) {
                metaBox.style.display = 'block';
                metaTags.innerHTML = `
                    ${post.LOCATION ? `<div class="meta-tag" style="display:inline-block; margin-right:8px; padding:4px 8px; background:#f3f4f6; border-radius:4px; font-size:12px;">📍 <span>${escapeHTML(post.LOCATION)}</span></div>` : ''}
                    ${post.SEASON ? `<div class="meta-tag" style="display:inline-block; padding:4px 8px; background:#f3f4f6; border-radius:4px; font-size:12px;">🗓️ <span>${escapeHTML(post.SEASON)}</span></div>` : ''}
                `;
            } else {
                metaBox.style.display = 'none';
            }
        }


        const descInput = document.getElementById('descInput');
        if (descInput) descInput.value = post.CONTENT || '';

        const linkList = document.getElementById('linkList');
if (linkList) {
    linkList.innerHTML = '';
    
  
    if (post.LINK_URLS) {
        const urls = post.LINK_URLS.split('||');
        urls.forEach((url) => {
            if (!url.trim()) return;
            const row = document.createElement('div');
            row.className = 'link-row';
            row.innerHTML = `
                <div class="link-icon">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                </div>
                <input class="link-input" type="text" readonly value="${escapeHTML(url.trim())}" />
            `;
            linkList.appendChild(row);
        });
    } else {
        linkList.innerHTML = '<div style="color:#9ca3af; font-size:13px;">등록된 상품 링크가 없습니다.</div>';
    }
}

  
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.innerText = "삭제하기";
            registerBtn.onclick = function() {
                window.handleDeletePost(postId);
            };
        }

    } catch (err) {
        console.error(err);
        window.showToast('데이터를 가져오는 도중 문제가 발생했습니다.');
    }
};

// 🟢 [추가] 모달창 닫기 및 취소 함수 공통화
window.closeModal = window.handleCancel = function() {
    const modalOverlay = document.getElementById('uploadModalOverlay');
    if(modalOverlay) modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
};

// 🟢 [추가] 모달창 내 삭제하기 액션 실행 함수
window.handleDeletePost = function(postId) {
    if (!confirm('🚨 이 게시물을 정말로 삭제하시겠습니까?\n삭제된 코디 목록은 복구되지 않습니다.')) {
        return;
    }

    fetch(`/api/outfit/delete/${postId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.showToast('✅ 정상적으로 삭제되었습니다.');
            window.closeModal();
            location.reload(); // 화면 새로고침하여 리스트 동기화
        } else {
            window.showToast('❌ 삭제 작업 실패: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        window.showToast('❌ 서버 통신 오류가 발생했습니다.');
    });
};

document.addEventListener("DOMContentLoaded", async() => {
    const idInput = document.getElementById("id");
    const modify = document.getElementById("modify");

    const params = new URLSearchParams(window.location.search);
    const urlProfileId = params.get("profileId");

    try {
        const response = await fetch("/api/auth/mypage");
        const result = await response.json();

        if(!result.success) {
            window.location.href="/login";
            return;
        }
        const loginUserProfileId = result.user.profileId;

        // URL에 profileId가 있으면 그 프로필을 보여주고, 없으면 로그인한 내 프로필을 보여줌
        const currentProfileId = urlProfileId || loginUserProfileId;

        const profileTitle = document.getElementById("profileTitle");

        if(profileTitle) {
            profileTitle.textContent = `@${currentProfileId}`;
        }

        if(idInput) {
            idInput.value = `@${currentProfileId}`;
        }

        // URL의 사용자 아이디와 로그인한 사용자 아이디가 다르면 프로필 수정 버튼 숨김
        if (modify) {
            if (currentProfileId !== loginUserProfileId) {
                modify.style.setProperty("display", "none", "important");
                
                // 타인 프로필을 조회 중인 경우 내 게시물이 아니므로 삭제 권한 제어 (버튼 숨김 처리)
                const registerBtn = document.getElementById('registerBtn');
                if(registerBtn) registerBtn.style.display = 'none';
          } else {
                modify.style.setProperty("display", "inline-block", "important");
                const registerBtn = document.getElementById('registerBtn');
                if(registerBtn) registerBtn.style.display = 'inline-block';
          }
            modify.addEventListener("click", () => {
                window.location.href = "/modify";
            });
        
     } 
     await loadScraps(currentProfileId);
     await loadFollows(currentProfileId);
     await loadPosts(currentProfileId);
     await loadComments(currentProfileId);
    
    } catch (error) {
        console.error(error);
        window.location.href = "/login";
    }    
});