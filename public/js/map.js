var currentMarker = null;
var currentInfoWindow = null;

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

                    if(currentMarker) {
                        currentMarker.setMap(null);
                    }
                    if(currentInfoWindow) {
                        currentInfoWindow.close();
                    }

                    var coords = new kakao.maps.LatLng(result[0].y, result[0].x);

                    var fullAddress = result[0].address_name;
                    var regionName = extractDongName(fullAddress);
                    //console.log("검색된 지역이름: ",regionName);
                    //updateStatusUI(regionName, selectedSeason);

                    currentMarker = new kakao.maps.Marker({ // 검색한 마커만 뜨고 예전 마커 삭제
                        map: map,
                        position: coords
                    });

                    map.setCenter(coords);
                    map.setLevel(5);

                    currentInfoWindow= new kakao.maps.InfoWindow({
                        content: `<div style="width:150pxl text-align:center; padding: 6px 0;">${regionName}</div>`
                    });

                    currentInfoWindow.open(map, currentMarker);

                    kakao.maps.event.addListener(currentMarker, 'click', function() {
                        const mapContainer = document.getElementById('map-container');
                        const sidePanel = document.getElementById('side-panel');

                        mapContainer.classList.add('shrink');
                        sidePanel.classList.remove('hidden');

                        setTimeout(function() {
                            map.relayout();
                            map.setCenter(currentMarker.getPosition());

                        },500);
                    });
                }

            });

        }

        kakao.maps.event.addListener(map, 'idle', function() {
            var center = map.getCenter();

            geocoder.coord2RegionCode(center.getLng(), center.getLat(), function(result, status) {
                if (status===kakao.maps.services.Status.OK) {
                    for (var i=0; i < result.length; i++){
                        if(result[i].region_type === 'H') {
                            var currentRegion = result[i].region_3depth_name;

                            console.log("현재 화면 중심 지역:", currentRegion);
                            updateStatusUI(currentRegion, selectedSeason);
                            
                            // 서버에 데이터 요청 칸!!!!!!//

                            break;
                        }
                    }
                }
            });

        });

        kakao.maps.event.addListener(map, 'click', function() {
            //console.log("지도 빈 곳 클릭됨 -> 복귀");

            const mapContainer = document.getElementById('map-container');
            const sidePanel = document.getElementById('side-panel');

            if(mapContainer.classList.contains('shrink')) {
                console.log("복귀 시작");
                mapContainer.classList.remove('shrink');
                sidePanel.classList.add('hidden');

                let count = 0;
                const relayouter = setInterval(function() {
                    map.relayout();
                    map.setCenter(map.getCenter());
                    count++;
                    if(count > 10) clearInterval(relayouter);
                }, 50);
            }
        });

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

            const currentRegionText = document.getElementById('display-region').innerText;
            updateStatusUI(currentRegionText, selectedSeason);
            
        };
        container.appendChild(btn);
    });
}

// function updateStatusUI(region, season) {
//     document.getElementById('display-region').innerText = region;

//     const seasonName = seasons.find(s => s.id === season)?.name || season;
//     document.getElementById('display-season').innerText = seasonName;

//     //계절버튼 클릭 시 호출 작성
//     //검색 성공시 호출 작성
//     //지도 이동 시 호출 작성
// }

function updateStatusUI(region, seasonId) {
    const regionDisplay = document.getElementById('display-region');
    const seasonDisplay = document.getAnimations('display-season');

    if (regionDisplay) regionDisplay.innerText = region;

    if(seasonDisplay) {
        const seasonObj = seasons.find(s => s.id === seasonId);
        seasonDisplay.innerText = seasonObj ? seasonObj.name : seasonId;
    }

    const regionSpan = document.getElementById('display-region');
    const seasonSpan = document.getElementById('display-season');

    if(regionSpan) {
        regionSpan.innerText = region;
    }

    if(seasonSpan) {
        const seasonObj = seasons.find(s => s.id ===seasonId);
        seasonSpan.innerText = seasonObj ? seasonObj.name : seasonId;
    }
}



window.addEventListener('DOMContentLoaded', initSeasonButtons);