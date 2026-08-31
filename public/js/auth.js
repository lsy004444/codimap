//const loginbtn=document.getElementById('login');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

emailInput.addEventListener('keydown',function(event) {
    if(event.key === 'Enter') {
        event.preventDefault();
        passwordInput.focus();
    }
});


window.showToast = function(message) {
    const toast = document.getElementById("login-toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}


// 로그인 버튼 클릭했을 때 동작하는 코드
loginForm.addEventListener('submit',async function(event) {
    event.preventDefault();

    // 값 가져오기
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 자동 로그인
    const autoLogin = document.getElementById('autoLogin').checked;

    // 로그인에 성공했을 경우 
    if(email === "") {
        window.showToast("이메일을 입력해주세요!");
        emailInput.focus();
        return;
    }

    if(password === "") {
        window.showToast("비밀번호를 입력해주세요!");
        passwordInput.focus();
        return;
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password,
                autoLogin: autoLogin
            })
        });

        const result = await response.json();

        if(result.success) {
            window.showToast("🔒로그인 되었습니다.");

            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } else {
            window.showToast(result.message);
        }
    } catch (error) {
        window.showToast("🔒로그인 요청 중 오류가 발생했습니다.");
    }
})

