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

let selectedSeason = 'spring'; 


const seasons = [
    { id: 'spring', name: '봄', color: '#FFB7C5' },
    { id: 'summer', name: '여름', color: '#7FB3D5' },
    { id: 'fall', name: '가을', color: '#E67E22' },
    { id: 'winter', name: '겨울', color: '#A9CCE3' },
];

function initSeasonButtons() {
    
    const container = document.getElementById('season-filter-container');
    if (!container) {
        console.error("컨테이너를 찾을 수 없습니다!");
        return;
    }

    container.innerHTML = ''; 

    seasons.forEach((season) => {
        const btn = document.createElement('button');
        btn.innerText = season.name;
        btn.className = 'season-btn';

    
        if (season.id === selectedSeason) {
            btn.style.backgroundColor = season.color;
            btn.style.color = 'white';
        }

        btn.onclick = () => {
            selectedSeason = season.id;

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

window.addEventListener('DOMContentLoaded', initSeasonButtons);