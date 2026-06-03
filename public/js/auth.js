const loginbtn=document.getElementById('login');

window.showToast = function(message) {
    const toast = document.getElementById("login-toast");

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 1000);
};

// 로그인 버튼 클릭했을 때 동작하는 코드
loginbtn.addEventListener('click',async function(event) {
    event.preventDefault();

    // 값 가져오기
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 로그인에 성공했을 경우 
    if(email === "" && password === "") {
        alert("이메일과 비밀번호를 입력해주세요!");
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
                password: password
            })
        });

        const result = await response.json();

        if(result.success) {
            window.showToast("🔒로그인 되었습니다.");

            setTimeout(() => {
                window.location.href = "/map";
            }, 1000);
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error(error);
        alert("로그인 요청 중 오류가 발생했습니다.");
    }
})

