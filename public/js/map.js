
window.onload = function() {
    kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(36.2683, 127.6358),
            level: 13
        };
        var map = new kakao.maps.Map(container, options);
    });
};

// 1. [수정] React 문법인 useState는 삭제해야 합니다. Vanilla JS 변수만 사용하세요.
let selectedSeason = 'spring'; 

// 2. [수정] 스펠링 통일 (seosons -> seasons)
const seasons = [
    { id: 'spring', name: '봄', color: '#FFB7C5' },
    { id: 'summer', name: '여름', color: '#7FB3D5' },
    { id: 'fall', name: '가을', color: '#E67E22' },
    { id: 'winter', name: '겨울', color: '#A9CCE3' },
];

function initSeasonButtons() {
    // 3. [수정] HTML에 만든 ID와 똑같이 맞춤 (seoson -> season)
    const container = document.getElementById('season-filter-container');
    if (!container) {
        console.error("컨테이너를 찾을 수 없습니다!");
        return;
    }

    container.innerHTML = ''; // 중복 생성 방지

    seasons.forEach((season) => {
        const btn = document.createElement('button');
        btn.innerText = season.name;
        btn.className = 'season-btn';

        // 초기 스타일 설정
        if (season.id === selectedSeason) {
            btn.style.backgroundColor = season.color;
            btn.style.color = 'white';
        }

        btn.onclick = () => {
            selectedSeason = season.id;

            // 모든 버튼 초기화 후 클릭된 버튼만 색상 변경
            document.querySelectorAll('.season-btn').forEach((b, idx) => {
                b.style.backgroundColor = 'white';
                b.style.color = '#333';
                if (seasons[idx].id === selectedSeason) {
                    b.style.backgroundColor = seasons[idx].color;
                    b.style.color = 'white';
                }
            });
            console.log("선택된 계절:", selectedSeason);
        };
        container.appendChild(btn);
    });
}

// 4. [수정] 마침표(.)를 쉼표(,)로 수정하고 함수 이름 스펠링 확인
window.addEventListener('DOMContentLoaded', initSeasonButtons);