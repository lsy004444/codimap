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
    const existing = document.querySelector('.upload-toast');
    if(existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'upload-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.remove(), 2500);
}

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

    //alert(result.message);
    window.showToast(result.message);

    if(result.success) {
        setTimeout(() => {
            window.location.href = `/mypage?profileId=${encodeURIComponent(result.profileId)}`;
        }, 2000);
    }
   } catch(error) {
    console.error(error);
    window.showToast("회원정보 수정 중 오류가 발생했습니다.");
    //alert("회원정보 수정 중 오류가 발생했습니다.");
   }
}
//탈퇴하기
function handleWithdraw() {
    const confirmToast = document.createElement('div');
    confirmToast.id = 'withdraw-confirm';
    confirmToast.style.cssText = 'position:fixed; bottom:200px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg, rgba(250,248,255,0.97), rgba(255,248,252,0.97)); color:#888; padding:14px 24px; border-radius:20px; font-size:13px; z-index:10001; box-shadow:0 4px 20px rgba(200,160,184,0.2); display:flex; align-items:center; gap:12px; white-space:nowrap; backdrop-filter:blur(12px); border:1.5px solid rgba(200,180,210,0.3);';
    confirmToast.innerHTML = `
        <span>정말 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.</span>
        <button onclick="(async()=>{
            const res = await fetch('/api/auth/withdraw', {method:'DELETE'});
            const data = await res.json();
            if(data.success) {
                window.showToast('탈퇴가 완료되었습니다.');
                setTimeout(()=>window.location.href='/login', 1500);
            }
            document.getElementById('withdraw-confirm')?.remove();
        })()" style="background:rgba(200,180,210,0.4); color:#7a5a8a; border:none; border-radius:12px; padding:5px 12px; font-size:12px; cursor:pointer; font-weight:600;">확인</button>
        <button onclick="document.getElementById('withdraw-confirm').remove();" style="background:rgba(200,180,210,0.15); color:#aaa; border:none; border-radius:12px; padding:5px 12px; font-size:12px; cursor:pointer; font-weight:600;">취소</button>
    `;
    document.body.appendChild(confirmToast);
    setTimeout(() => confirmToast?.remove(), 5000);
}
