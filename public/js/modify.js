// 변경하기 버튼을 누를 경우 발생하는 이벤트
function completeModify() {
    const userId = document.getElementById("userId").value;
    const password = document.getElementById("password").value;
    
    if(!userId) {
        alert("변경할 아이디를 입력해주세요.");
        return;
    }

    if(!password)
    {
        alert("변경할 비밀번호를 입력해주세요.");
        return;
    }
    
    // 아이디 or 비밀번호 수정 후 팝업 창 띄움
    alert("회원정보 수정이 완료되었습니다!");
 
    // 변경하기 버튼 누르면 마이페이지 화면으로 이동
    window.location.href = "mypage.html";
}
