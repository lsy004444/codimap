// 아이디: 영문, 숫자, 기호만 허용 + 정확히 8자리
function isValidUserId(userId) {
    const idPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]{8}$/;
    return idPattern.test(userId);
}

// 비밀번호: 영문, 숫자, 기호만 허용 + 길이 제한 없음
function isValidPassword(password) {
    const passwordPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]+$/;
    return passwordPattern.test(password);
}

window.showToast = function(message) {
    const toast = document.getElementById("modify-toast");

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 1000);
};

// 변경하기 버튼을 누를 경우 발생하는 이벤트
async function completeModify() {
    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value.trim();
    
    // 아이디, 비밀번호 둘 다 비어있을 경우
    if(!userId && !password) {
        window.showToast("변경할 아이디 또는 비밀번호를 입력해주세요.");
        //alert("변경할 아이디 또는 비밀번호를 입력해주세요.");
        return;
    }

    if (userId && !isValidUserId(userId)) {
        window.showToast("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
        //alert("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
        return;
    }

    if (password && !isValidPassword(password)) {
        window.showToast("비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다.");
        //alert("비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다.");
        return;
    }
    
   try {
    const response = await fetch("/api/auth/modify", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            newId: userId,
            newPassword: password
        })
    });

    const result = await response.json();

    alert(result.message);

    if(result.success) {
        window.location.href = `/mypage?profileId=${encodeURIComponent(result.profileId)}`;
    }
   } catch(error) {
    console.error(error);
    alert("회원정보 수정 중 오류가 발생했습니다.");
   }
}
