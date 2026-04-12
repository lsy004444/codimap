window.onload = function() {
    kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(36.2683, 127.6358),
            level: 13
        };
        var map = new kakao.maps.Map(container, options);

        var geocoder = new kakao.maps.services.Geocoder();
        function searchLocation(keyword) {

            geocoder.addressSearch(keyword, function(result, status){
                if(status === kakao.maps.services.Status.OK) {
                    var coords = new kakao.maps.LatLng(result[0].y, result[0].x);

                    var fullAddress = result[0].address_name;
                    var regionName = extractDongName(fullAddress);
                    console.log("검색된 지역이름: ",regionName);

                    var marker = new kakao.maps.Marker({
                        map: map,
                        position: coords
                    });
                    map.setCenter(coords);
                    map.setLevel(5);

                    var infowindow = new kakao.maps.InfoWindow({
                        content: `<div style="width:150px;text-align:center;padding:6px 0;">${regionName}</div>`
                    });
                    infowindow.open(map, marker);
                }
            })
        }
        function extractDongName(address) {
            const match = address.match(/([가-힣]+(동|면|읍)) (?=\s|$)/);
            return match ? match[1] : address;
        }

        const searchInput = document.querySelector('.search-box input');
        searchInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
                searchLocation(this.value);
            }
        });
        initSeasonButtons();
    
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