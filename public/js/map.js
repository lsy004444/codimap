var currentMarker = null;

var currentCoords = null;
var currentRegionName = null;

window.onload = function() {
        kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(36.2683, 127.6358),
            level: 13
        };
        var map = new kakao.maps.Map(container, options);
        var geocoder = new kakao.maps.services.Geocoder();

        function searchLocation(keyword) { // 사용자가 지역 검색하면 위경도 좌표로 바꾸고 지도 이동시켜줌
            document.getElementById('current-filter-info').style.display = 'block';
            geocoder.addressSearch(keyword, function(result, status){
                if(status === kakao.maps.services.Status.OK) {
                
                    if(currentMarker) {
                        currentMarker.setMap(null);
                    }

                    var coords = new kakao.maps.LatLng(result[0].y, result[0].x);

                    currentCoords = coords;
                    

                    var fullAddress = result[0].address_name;
                    var regionName = extractDongName(fullAddress);
                    currentRegionName = regionName;
                    //console.log("검색된 지역이름: ",regionName);
                    //updateStatusUI(regionName, selectedSeason);


                    const seasonColors = {
                        spring: '#FFB7C5',
                        summer: '#7FB3D5',
                        fall: '#E67E22',

                        winter: '#A0CCE3'
                    };

                    var markerContent = `
                    <div onclick="openPanel()" style="
                        background: ${seasonColors[selectedSeason]};
                        border-radius: 20px;
                        padding: 8px 14px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        font-family: 'Apple SD Gothic Neo', sans-serif;
                        white-space: nowrap;
                        cursor: pointer;
                    ">
                        <span style="font-size: 14px;">👗</span>
                        <span style="font-weight: 700; font-size: 13px; color: white;">${regionName}</span>
                    </div>
                `   ;

                    currentMarker = new kakao.maps.CustomOverlay({ // 검색한 마커만 뜨고 예전 마커 삭제
                        map: map,
                        position: coords,
                        content: markerContent,
                        yAnchor:1

                    });
                   
                    
                    map.setCenter(coords);

                    document.getElementById('current-filter-info').style.display = 'block';
                    updateStatusUI(regionName, selectedSeason);

                    map.setLevel(5);

                    setTimeout(function() {
                    map.relayout();
                    map.setCenter(coords);
                }, 100);

                }
            });
        }
        


        kakao.maps.event.addListener(map, 'idle', function() {

            if(currentMarker) return;
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

        kakao.maps.event.addListener(map, 'click', function() { //모달이 나와있는 상태에서 지도 아무곳을 누르면 모달 들어가고 지도 원래대로 복귀

            const mapContainer = document.getElementById('map-container');
            const sidePanel = document.getElementById('side-panel');

            if(mapContainer.classList.contains('shrink')) {
                console.log("복귀 시작");
                mapContainer.classList.remove('shrink');
                sidePanel.classList.add('hidden');


                setTimeout(function() {
                map.relayout();
                if(currentCoords) {
                    map.setCenter(currentCoords);
                }
            }, 600);
  

            }
        });

        function extractDongName(address) { //행정구역 중 '동'만 추출
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

        window.openPanel = function() {
            const mapContainer = document.getElementById('map-container');
            const sidePanel = document.getElementById('side-panel');
            const feedFrame = document.getElementById('feed-frame');

            if(feedFrame && currentRegionName) {
                feedFrame.src = `/feed?region=${encodeURIComponent(currentRegionName)}&season=${selectedSeason}`;
            }

            mapContainer.classList.add('shrink');
            sidePanel.classList.remove('hidden');

            setTimeout(function() {
                map.relayout();
                if(currentCoords) {
                    map.setCenter(currentCoords);
                }
            }, 500);
        }

        window.updateMarker = function(seasonId) {
            if(currentMarker && currentCoords && currentRegionName) {
                currentMarker.setMap(null);
                const seasonColors = {
                    spring: '#FFB7C5',
                    summer: '#7FB3D5',
                    fall: '#E67E22',
                    winter: '#A9CCE3'
                };
                var markerContent = `
                    <div onclick="openPanel()" style="
                        background: ${seasonColors[seasonId]};
                        border-radius: 20px;
                        padding: 8px 14px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        font-family: 'Apple SD Gothic Neo', sans-serif;
                        white-space: nowrap;
                        cursor: pointer;
                    ">
                        <span style="font-size: 14px;">👗</span>
                        <span style="font-weight: 700; font-size: 13px; color: white;">${currentRegionName}</span>
                    </div>
                `;
                currentMarker = new kakao.maps.CustomOverlay({
                    map: map,
                    position: currentCoords,
                    content: markerContent,
                    yAnchor: 1
                });
            }
        }

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


            //iframe에 변경사항 전달
            const feedFrame = document.getElementById('feed-frame');
            if(feedFrame && feedFrame.contentWindow) {
                feedFrame.contentWindow.feedUpdateFilter(
                    currentRegionName || '전국',
                    season.id
                );
            }
            if(window.updateMarker) window.updateMarker(season.id);
        };

        

        container.appendChild(btn);
        
    });
}



function updateStatusUI(region, seasonId) {
    const regionSpan = document.getElementById('display-region');
    const seasonSpan = document.getElementById('display-season');
    const filterInfo = document.getElementById('current-filter-info');

    if(regionSpan) regionSpan.innerText = region;

    if(seasonSpan) {
        const seasonObj = seasons.find(s => s.id === seasonId);
        seasonSpan.innerText = seasonObj ? seasonObj.name : seasonId;
    }

    if(filterInfo) {
        const seasonObj = seasons.find(s => s.id === seasonId);
        if(seasonObj) {
            filterInfo.style.borderLeft = `4px solid ${seasonObj.color}`;
            regionSpan.style.color = seasonObj.color;
            seasonSpan.style.color = seasonObj.color;
        }
    }
   
    

}




window.addEventListener('DOMContentLoaded', initSeasonButtons);