// 탭을 눌렀을 경우 발생하는 이벤트
function openTab(event, tabId) {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // 초기에 선택되어 있던 탭 강조 표시 지움
    tabItems.forEach(item => {
        item.classList.remove('active');
    });

    // 초기에 선택되어 있던 탭의 내용 지움
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // 현재 선택한 탭에 강조 및 선택한 탭에 해당하는 내용 표시
    event.currentTarget.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}