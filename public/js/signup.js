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
    emailBtn.addEventListener("click", async(addEventListener) => {
        event.preventDefault();
        
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

        try{
            const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
            const result = await response.json();

            alert(result.message);

            if(result.available) {
                isEmailChecked = true;
            } else {
                isEmailChecked = false;
                emailInput.focus();
            }
        } catch (error) {
            console.error(error);
            alert("이메일 중복확인 중 오류가 발생했습니다.");
            isEmailChecked = false;
        }
});

    // 아이디 중복확인 버튼 클릭 시 발생
    userIdBtn.addEventListener("click", async(event) => {
        event.preventDefault();

        const userId = userIdInput.value.trim();

        if(userId === "") {
            alert("아이디를 입력해주세요.");
            userIdInput.focus();
            return;
        }

        try{
            const response = await fetch(`/api/auth/check-id?userId=${encodeURIComponent(userId)}`);
            const result = await response.json();

            alert(result.message);

            if(result.available) {
                isIdChecked = true;
            } else {
                isIdChecked = false;
                userIdInput.focus();
            }
        } catch (error) {
            console.error(error);
            alert("아이디 중복확인 중 오류가 발생했습니다.");
            isIdChecked = false;
        }
    });

    emailInput.addEventListener("input", () => {
        isEmailChecked = false;
    });

    userIdInput.addEventListener("input", () => {
         isIdChecked = false;
    });

    // 회원가입 버튼 클릭 시 발생
    signupForm.addEventListener("submit", async(event) => {
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

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    userId: userId,
                    password: password
                })
            });

            const result = await response.json();

            alert(result.message);

            if(result.success) {
                window.location.href = "/login";
            }
        } catch (error) {
            console.error(error);
            alert("회원가입 요청 중 오류가 발생했습니다.");
        }
     });
});




