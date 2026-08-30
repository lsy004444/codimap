document.addEventListener("DOMContentLoaded", async () => {
    const signupForm = document.getElementById("signupForm");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const userIdInput = document.getElementById("userId");
    const passwordInput = document.getElementById("password");

    const emailBtn = document.getElementById("emailBtn");
    const userIdBtn = document.getElementById("userIdBtn");

    // /signup?social=true로 들어왔을 경우 아이디만 입력하도록 설정
    let isSocialSignup = false;

    // const params = new URLSearchParams(window.location.search);

    //     if(params.get('social') !== 'true') {
    //         return;
    //     }

    //     try {
    //         const response = await fetch('/api/auth/social_signup_info');
    //         const data = await response.json();

    //         if(!response.ok) {
    //             console.error(data.message);
    //             window.location.replace('/signup');
    //             return;
    //         }

    //         isSocialSignup = true;

    //         // 이름 숨기기
    //         document.getElementById('name').closest('.input-group').style.display = 'none';

    //         // 이메일 + 이메일 중복확인 숨기기
    //         document.getElementById('email').closest('.input-group').style.display = 'none';

    //     // 비밀번호 숨기기
    //     document.getElementById('password').closest('.input-group').style.display = 'none';

    //     const socialSignup = document.querySelector('.social-signup');

    //     if(socialSignup) {
    //         socialSignup.style.display = 'none';
    //     }

    //     document.querySelector('.signup-title').textContent = '아이디 설정';
    //     document.getElementById('signupBtn').textContent = '가입 완료';
    // } catch(error) {
    //     console.error('소셜 회원가입 정보 확인 오류:', error);
    // }

    try {
    const response = await fetch('/api/auth/social_signup_info');
    const data = await response.json();

    if(!response.ok) {
        console.error('소셜 회원가입 정보 확인 실패:', data.message);
    } 
    else if(data.socialSignup) {
        // 소셜 인증을 거치고 온 사용자
        isSocialSignup = true;

        // 이름 숨기기
        nameInput
            .closest('.input-group')
            .style.display = 'none';

        // 이메일 숨기기
        emailInput
            .closest('.input-group')
            .style.display = 'none';

        // 비밀번호 숨기기
        passwordInput
            .closest('.input-group')
            .style.display = 'none';

        // Google / Kakao 버튼 숨기기
        const socialSignup = document.querySelector('.social-signup');

        if(socialSignup) {
            socialSignup.style.display = 'none';
        }

        // 화면 문구 변경
        document.querySelector('.signup-title').textContent = '아이디 설정';
        document.getElementById('signupBtn').textContent = '가입 완료';
    }

} catch(error) {
    console.error('소셜 회원가입 정보 확인 오류:', error);
}


    // 중복확인 여부 저장
    let isEmailChecked = false;
    let isIdChecked = false;

    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    // 아이디: 영문, 숫자, 기호만 허용 + 정확히 8자리
    function isValidUserId(userId) {
        const idPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]{8}$/;
        return idPattern.test(userId);
    }

    // 비밀번호: 영문, 숫자, 기호만 허용, 길이 제한 없음
    function isValidPassword(password) {
        const passwordPattern = /^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]+$/;
        return passwordPattern.test(password);
    }

    window.showToast = function(message) {
    const toast = document.getElementById("signup-toast");

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 1000);
};

    // 이메일 중복확인 버튼 클릭 시 발생
    emailBtn.addEventListener("click", async(event) => {
        event.preventDefault();
        
        const email = emailInput.value.trim();

        if(email === "") {
            window.showToast("이메일을 입력해주세요");
            //alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
        }

        if(!isValidEmail(email)) {
            window.showToast("올바른 이메일 형식으로 입력해주세요.");
            //alert("올바른 이메일 형식으로 입력해주세요.");
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
            window.showToast("이메일 중복확인 중 오류가 발생했습니다.");
            //alert("이메일 중복확인 중 오류가 발생했습니다.");
            isEmailChecked = false;
        }
});

    // 아이디 중복확인 버튼 클릭 시 발생
    userIdBtn.addEventListener("click", async(event) => {
        event.preventDefault();

        const userId = userIdInput.value.trim();

        if(userId === "") {
            window.showToast("아이디를 입력해주세요.");
            //alert("아이디를 입력해주세요.");
            userIdInput.focus();
            return;
        }

        if (!isValidUserId(userId)) {
            window.showToast("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
            //alert("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
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
            window.showToast("아이디 중복확인 중 오류가 발생했습니다.");
            //alert("아이디 중복확인 중 오류가 발생했습니다.");
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

         if(isSocialSignup) {
        const userId = userIdInput.value.trim();

        if(userId === "") {
            window.showToast("아이디를 입력해주세요.");
            userIdInput.focus();
            return;
        }

        if(!isValidUserId(userId)) {
            window.showToast(
                "아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요."
            );
            userIdInput.focus();
            return;
        }

        if(!isIdChecked) {
            window.showToast("아이디 중복확인을 해주세요.");
            userIdBtn.focus();
            return;
        }

        await submitSocialSignup();
        return;
    }

         const name = nameInput.value.trim();
         const email = emailInput.value.trim();
         const userId = userIdInput.value.trim();
         const password = passwordInput.value.trim();
            
         if(name === "") {
            window.showToast("이름을 입력해주세요.");
            //alert("이름을 입력해주세요.");
            nameInput.focus();
            return;
         }

         if(email === "") {
            window.showToast("이메일을 입력해주세요.");
            //alert("이메일을 입력해주세요.");
            emailInput.focus();
            return;
         }

         if(!isValidEmail(email)) {
            window.showToast("올바른 이메일 형식으로 입력해주세요.");
            //alert("올바른 이메일 형식으로 입력해주세요.");
             emailInput.focus();
             return;
         }

         if(!isEmailChecked) {
            window.showToast("이메일 중복확인을 해주세요.");
             //alert("이메일 중복확인을 해주세요.");
             emailBtn.focus();
              return;
         }

         if(userId === "") {
            window.showToast("아이디를 입력해주세요.");
             //alert("아이디를 입력해주세요.");
             userIdInput.focus();
             return;
         }

         if (!isValidUserId(userId)) {
            window.showToast("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
            //alert("아이디는 영문, 숫자, 기호를 사용하여 정확히 8자리로 입력해주세요.");
            userIdInput.focus();
            return;
        }

         if (!isIdChecked) {
            window.showToast("아이디 중복확인을 해주세요.");
            //alert("아이디 중복확인을 해주세요.");
            userIdBtn.focus();
            return;
        }

        if (password === "") {
            window.showToast("비밀번호를 입력해주세요.");
            //alert("비밀번호를 입력해주세요.");
            passwordInput.focus();
            return;
        }

        if (!isValidPassword(password)) {
            window.showToast("비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다.");
            //alert("비밀번호는 영문, 숫자, 기호만 사용할 수 있습니다.");
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

            //alert(result.message);
            window.showToast(result.message);

            if(result.success) {
                setTimeout(() => {
                     window.location.href = "/login";
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            window.showToast("회원가입 요청 중 오류가 발생했습니다.");
           //alert("회원가입 요청 중 오류가 발생했습니다.");
        }
     });

async function submitSocialSignup() {
    const userId = document.getElementById('userId').value.trim();
    try {
        const response = await fetch('/api/auth/social_signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId
            })
        });

        const data = await response.json();

        if(!response.ok) {
            showToast(data.message);
            return;
        }

        // 성공
        showToast(data.message);

        setTimeout(() => {
            window.location.replace('/');
        }, 1000);
    } catch(error) {
        console.error('소셜 회원가입 오류:', error);
        showToast('회원가입 중 오류가 발생했습니다.');
    }
}
});

