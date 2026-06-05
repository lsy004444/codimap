window.showToast = function(message) {
    const toast = document.getElementById("find-toast");

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 1000);
};

// html 문서가 로딩된 뒤 js 실행
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("findPwForm");
    const emailInput = document.getElementById("email");
    const sendEmailBtn = document.getElementById("sendEmailBtn");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const emailValue = emailInput.value.trim();

        if(emailValue === "") {
            window.showToast("이메일을 입력해주세요.");
            //alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailRegex.test(emailValue)) {
            window.showToast("올바른 이메일 형식이 아닙니다.");
            //alert("올바른 이메일 형식이 아닙니다.");
            emailInput.focus();
            return;
        }

        try{
            sendEmailBtn.disabled = true;

            const response = await fetch("/api/auth/find_pw", {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                    email: emailValue
                })
            });

            const result = await response.json();

            //alert(result.message);
            window.showToast(result.message);

            if(result.success) {
                setTimeout(() => {
                     window.location.href = "/login";
                }, 2000);
            } else {
                sendEmailBtn.disabled = false;
                sendEmailBtn.textContent = "이메일 전송";
            }
        } catch(error) {
            console.error(error);
            window.showToast("임시 비밀번호 전송 중 오류가 발생했습니다.");
            //alert("임시 비밀번호 전송 중 오류가 발생했습니다.");

            sendEmailBtn.disabled = false;
            sendEmailBtn.textContent = "이메일 전송";
        }
    });
});

