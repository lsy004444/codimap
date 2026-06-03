//const { response } = require("express");

// 탭을 눌렀을 경우 발생하는 이벤트
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

// document.addEventListener("DOMContentLoaded", async() => {
//     const idInput = document.getElementById("id");
//     const modify = document.getElementById("modify");

//     const params = new URLSearchParams(window.location.search);
//     const urlProfileId = params.get("profileId");

//     try {
//         const response = await fetch("/api/auth/mypage");
//         const result = await response.json();

//         if(!result.success) {
//             alert(result.message);
//             window.location.href="/login";
//             return;
//         }

//         userIdInput.value = result.user.profileId;
//     } catch(error) {
//         console.error(error);
//         alert("사용자 정보를 불러오는 중 오류가 발생했습니다.");
//         window.location.href="/login";
//     }

//     if(modify) {
//         modify.addEventListener("click", () => {
//             window.location.href = "/modify";
//         });
//     }
// });

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

function renderPostCard(post) {
    const imageUrl = getFirstImage(post.IMAGE_URLS);
    const content = escapeHTML(post.CONTENT || "");

    return `
    <div class="grid post-card" onclick="location.href='/feed?postId=${post.POST_ID}'">
        ${
            imageUrl
                ? `<img src="${escapeHTML(imageUrl)}" alt="게시물 이미지">`
                : `<div class="empty-image">이미지 없음</div>`
        }
        <div class="post-info">ㅈ
            <p>${content}</p>ㅇ
            <small>좋아요 ${post.LIKE_COUNT || 0}, 스크랩 ${post.SCRAP_COUNT || 0}</small>
        </div>
    <div>
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

        scrapList.innerHTML = result.scraps.map(renderPostCard).join("");
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

        postList.innerHTML = result.posts.map(renderPostCard).join("");

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

        if(idInput) {
            idInput.value = `@${currentProfileId}`;
        }

        // URL의 사용자 아이디와 로그인한 사용자 아이디가 다르면 프로필 수정 버튼 숨김
        if (modify) {
            if (currentProfileId !== loginUserProfileId) {
                modify.style.setProperty("display", "none", "important");
          } else {
                modify.style.setProperty("display", "inline-block", "important");
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