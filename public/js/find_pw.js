// html 문서가 로딩된 뒤 js 실행
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("findPwForm");
    const emailInput = document.getElementById("email");
    const sendEmailBtn = document.getElementById("sendEmailBtn");

    form.addEventListener("submit", (event) => {
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

        sendEmailBtn.disabled = true;

        setTimeout(() => {
            alert("이메일로 비밀번호 관련 정보가 전송되었습니다.");

            window.location.href = "/login";
        }, 1000);
    });
})