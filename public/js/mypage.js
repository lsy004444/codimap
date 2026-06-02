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
    
    } catch (error) {
        console.error(error);
        
        window.location.href = "/login";
    }    
});