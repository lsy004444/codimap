// html 문서가 로딩된 뒤 js 실행
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("findPwForm");
    const emailInput = document.getElementById("email");
    const sendEmailBtn = document.getElementById("sendEmailBtn");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const emailValue = emailInput.value.trim();

        if(emailValue === "") {
            alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailRegex.test(emailValue)) {
            alert("올바른 이메일 형식이 아닙니다.");
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

            alert(result.message);

            if(result.success) {
                window.location.href = "/login";
            } else {
                sendEmailBtn.disabled = false;
                sendEmailBtn.textContent = "이메일 전송";
            }
        } catch(error) {
            console.error(error);
            alert("임시 비밀번호 전송 중 오류가 발생했습니다.");

            sendEmailBtn.disabled = false;
            sendEmailBtn.textContent = "이메일 전송";
        }
    });
});

