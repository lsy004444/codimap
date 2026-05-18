document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signupForm");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const userIdInput = document.getElementById("userId");
    const passwordInput = document.getElementById("password");

    const emailBtn = document.getElementById("emailBtn");
    const userIdBtn = document.getElementById("userIdBtn");

    // 중복확인 여부 저장
    let isEmailChecked = false;
    let isIdChecked = false;

    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    // 이메일 중복확인 버튼 클릭 시 발생
    emailBtn.addEventListener("click", () => {
        const email = emailInput.value.trim();

        if(email === "") {
            alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
        }

        if(!isValidEmail(email)) {
            alert("올바른 이메일 형식으로 입력해주세요.");
            emailInput.focus();
            return;
        }

        alert("사용 가능한 이메일입니다.");
        isEmailChecked = true;
});

    // 아이디 중복확인 버튼 클릭 시 발생
    userIdBtn.addEventListener("click", () => {
        const userId = userIdInput.value.trim();

        if(userId === "") {
            alert("아이디를 입력해주세요.");
            userIdInput.focus();
            return;
        }

        alert("사용 가능한 아이디입니다.");
        isIdChecked = true;
    });

    emailInput.addEventListener("input", () => {
        isEmailChecked = false;
    });

    userIdInput.addEventListener("input", () => {
         isIdChecked = false;
    });

    // 회원가입 버튼 클릭 시 발생
    signupForm.addEventListener("submit", (event) => {
         event.preventDefault();

         const name = nameInput.value.trim();
         const email = emailInput.value.trim();
         const userId = userIdInput.value.trim();
         const password = passwordInput.value.trim();
            
         if(name === "") {
            alert("이름을 입력해주세요.");
            nameInput.focus();
            return;
         }

         if(email === "") {
             alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
         }

         if(!isValidEmail(email)) {
             alert("올바른 이메일 형식으로 입력해주세요.");
             emailInput.focus();
             return;
         }

         if(!isEmailChecked) {
             alert("이메일 중복확인을 해주세요.");
             emailBtn.focus();
              return;
         }

         if(userId === "") {
             alert("아이디를 입력해주세요.");
             userIdInput.focus();
             return;
         }

         if (!isIdChecked) {
            alert("아이디 중복확인을 해주세요.");
            userIdBtn.focus();
            return;
        }

        if (password === "") {
            alert("비밀번호를 입력해주세요.");
            passwordInput.focus();
            return;
        }

        if (password.length < 6) {
            alert("비밀번호는 6자 이상 입력해주세요.");
            passwordInput.focus();
            return;
        }

         // 회원가입 후 팝업 창 띄움
        alert("회원가입이 완료되었습니다!");

         // 확인을 누르면 초기화면으로 이동->회원가입 후 로그인 해야 함
        window.location.href = "/index";
     });
});




