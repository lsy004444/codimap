// 회원탈퇴 페이지 진입 시 로그인 여부 확인
async function checkLogin() {
    try {
        const response = await fetch('/api/auth/mypage');

        if(response.status === 401) {
            alert('로그인이 필요합니다.');
            window.location.replace('/login');
            return;
        }

        if(!response.ok) {
            console.error('로그인 상태 확인 실패');
            return;
        }
    } catch (error) {
        console.error('로그인 확인 오류:',error);
    }
}

checkLogin();

const deleteAccountForm = document.getElementById('deleteAccountForm');
const passwordInput = document.getElementById('password');
const deleteAgree = document.getElementById('deleteAgree');

deleteAccountForm.addEventListener('submit', async(event) => {
    event.preventDefault();

    const password = passwordInput.value.trim();

    // 소셜 로그인 비밀번호를 null로 처리했으므로 
    // 이 부분 남기면 모든 사용자에게 비밀번호 요구하므로 주석 처리함
    // if(!password) { 
    //     alert('현재 비밀번호를 입력해주세요.');
    //     passwordInput.focus();
    //     return;
    // }

    if(!deleteAgree.checked) {
        alert('회원탈퇴 안내사항에 동의해주세요.');
        return;
    }

    const confirmed = confirm('정말 탈퇴하시겠습니까?\n탈퇴 후 계정을 복구할 수 없습니다.');

    if(!confirmed) {
        return;
    }

    try {
        const response = await fetch('/api/auth/delete_account', {
            method: 'DELETE',
            //credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: password
            })
        });

        const result = await response.json();

        if(result.requiresGoogleReauth) {
            window.location.href = result.redirectUrl;
            return;
        }
        
        // 일반, kakao 회원 탈퇴 성공했을 경우
        if(response.ok && result.success) {
            alert(result.message);
            window.location.href= '/login';
            return;
        }
        alert(result.message);


        // 소셜 계정 탈퇴로 인해 주석처리
        // if(!response.ok) {
        //     alert(result.message);
        //     return;
        // }

        // alert('탈퇴가 완료되었습니다.');
        // window.location.href = '/';
    } catch(error) {
        console.error('회원탈퇴 오류:',error);
        alert('탈퇴 중 오류가 발생했습니다.');
    }
});