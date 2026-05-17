const loginbtn=document.getElementById('login');

// 로그인 버튼 클릭했을 때 동작하는 코드
loginbtn.addEventListener('click',function() {
    // 값 가져오기
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 로그인에 성공했을 경우 
    if(email !== "" && password !== "") {
        window.location.href="map.html";
    } else {
        alert("이메일과 비밀번호를 입력해주세요!");
    }
<<<<<<< HEAD
})
=======
})
>>>>>>> origin/main
