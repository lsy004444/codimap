var currentMarker = null;
var currentCoords = null;
var currentRegionName = null;
var currentAddressType = 'dong';

window.onload = function() {
        kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(36.2683, 127.6358),
            level: 13,
            
        };
        var map = new kakao.maps.Map(container, options);
        var geocoder = new kakao.maps.services.Geocoder();

        function searchLocation(keyword) {

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

                    //시, 구, 동 구분
                    if(!fullAddress.match(/[가-힣]+(구|군)(\s|$)/) && !fullAddress.match(/[가-힣]+(동|면|읍)(\s|$)/)) {
                        currentAddressType = 'city';
                    } else if(fullAddress.match(/[가-힣]+(구|군)(\s|$)/) && !fullAddress.match(/[가-힣]+(동|면|읍)(\s|$)/)) {
                        currentAddressType = 'gu';
                    } else {
                        currentAddressType = 'dong';
                    }

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
                else {
                    showToast('검색 결과가 없습니다. 다시 입력해주세요.');
                }

            });

        }

        window.searchLocation = searchLocation; 

        //지도 축소 불가 경고 (zoom_changed는 무조건 레벨이 한번은 바뀌어서 다른거로 대체)
        //오... 다른방법이 없어서  그냥 zoom_changed로 지정
        kakao.maps.event.addListener(map, 'zoom_changed', function() {
            if(map.getLevel() >= 13) {
                map.setLevel(13, {animate: false}); // 애니메이션 없이 즉시 복구
                showToast('더 이상 축소할 수 없습니다.');
            }
        });

        kakao.maps.event.addListener(map, 'idle', function() {
            if(currentMarker) return;
            var center = map.getCenter();

            geocoder.coord2RegionCode(center.getLng(), center.getLat(), function(result, status) {
                if (status === kakao.maps.services.Status.OK) {
                    for (var i = 0; i < result.length; i++) {
                        if(result[i].region_type === 'H') {
                            var r = result[i];
                            var currentRegion = r.region_3depth_name || r.region_2depth_name || r.region_1depth_name;
                            updateStatusUI(currentRegion, selectedSeason);
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

                setTimeout(function() {
                map.relayout();
                if(currentCoords) {
                    map.setCenter(currentCoords);
                }
            }, 600);
  
            }
        });

        function extractDongName(address) {
            const match = address.match(/([가-힣]+(동|가|면|읍)) (?=\s|$)/);
            return match ? match[1] : address;
        }

        //세부 동명(ex 돈암2동) 검색 시 기본 동명으로 안내
        function normalizedongName(query) {
            const match2 = query.match(/^(.+?)(\d+)(가|나|다)(동)$/);
            //성수1가동 -> 성수동
            if(match2) {
                return match2[1] + match2[4];
            }
            return null;
            //돈암2동 -> 돈암동
            const match1 = query.match(/^(.+?)(\d+)(동)$/);
            if(match1) {
                return match1[1] + match1[3]; //성수1가동
            }

            return null
        }

        const searchInput = document.querySelector('.search-box input');
         //세부 동명(ex 돈암2동) 검색 시 기본 동명으로 안내
        searchInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
                const query = this.value.trim();
                const suggestion = normalizedongName(query);

                if(suggestion) {
                    showToast(`❌ "${suggestion}"으로 검색해 주세요`);
                    return;
                }
                searchLocation(query);
            }
        });
        initSeasonButtons();

        window.openPanel = function() {
            const mapContainer = document.getElementById('map-container');
            const sidePanel = document.getElementById('side-panel');
            const feedFrame = document.getElementById('feed-frame');

            if(feedFrame && currentRegionName) {
            const dongName = currentRegionName.split(' ').pop(); // ← 추가

            if(currentAddressType === 'gu') {
                feedFrame.src = `/feed?region=${encodeURIComponent(dongName)}&season=${selectedSeason}&gu=${encodeURIComponent(dongName)}&lat=${currentCoords.getLat()}&lng=${currentCoords.getLng()}&type=gu`;
            } else if (currentAddressType === 'city'){
                feedFrame.src = `/feed?region=${encodeURIComponent(dongName)}&season=${selectedSeason}&city=${encodeURIComponent(dongName)}&lat=${currentCoords.getLat()}&lng=${currentCoords.getLng()}&type=city`;
            } 
            else{
                feedFrame.src = `/feed?region=${encodeURIComponent(dongName)}&season=${selectedSeason}&lat=${currentCoords.getLat()}&lng=${currentCoords.getLng()}&type=dong`;
            }
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
            if(feedFrame && feedFrame.contentWindow && typeof feedFrame.contentWindow.feedUpdateFilter === 'function') {
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

//로그인 없이 게시물 등록 버튼 접근 시 토스트 지정
window.openModal = async function() {
    try {
        const response = await fetch('/api/auth/mypage');
        const result = await response.json();
        if(!result.success) {
            showToast('🔒 로그인이 필요합니다');
            return;
        }
        //로그인 시 모달 열기
        document.getElementById('uploadModalOverlay').style.display = 'flex';
    } catch(e) {
        showToast('🔒 로그인이 필요합니다');
    }
}

window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        document.body.style.opacity = '1';
    }
});

window.addEventListener('message', function(e) {
    if (e.data?.type === 'redirect-login') {
        const mapContainer = document.getElementById('map-container');
        const sidePanel = document.getElementById('side-panel');
        mapContainer?.classList.remove('shrink');
        sidePanel?.classList.add('hidden');
        window.location.href = '/login';
    }
});

//경고창 팝업
window.showToast = function(msg) {
    const existing = document.querySelector('.upload-toast');
    if(existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'upload-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.remove(), 2500);
}
function toggleSidebar() {
    const overlay = document.getElementById('sidebar-overlay');
    const menu = document.getElementById('sidebar-menu');
    overlay.classList.toggle('show');
    menu.classList.toggle('show');
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

function handleMenuClick(e) {
    if(e.target === document.getElementById('sidebar-menu') || 
       e.target.closest('.bubble-container') === null && 
       e.target.closest('.bubble-logout') === null) {
        toggleSidebar();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // fade-in
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.4s ease';
    setTimeout(() => document.body.style.opacity = '1', 50);

    //로그인 상태 확인 
    const authRes = await fetch('/api/auth/mypage');
    const authData = await authRes.json();

    if (authData.success) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'none';
        document.getElementById('divider1').style.display = 'none';
        document.getElementById('divider2').style.display = 'none';
    }

    // 로그아웃
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            const authRes = await fetch("/api/auth/mypage");
            const authData = await authRes.json();

                if (!authData.success) {
                    showToast('🔒 로그인이 필요합니다.');
                    setTimeout(() => {
                        document.body.style.transition = 'opacity 0.4s ease';
                        document.body.style.opacity = '0';
                        setTimeout(() => window.location.href = "/login", 400);
                    }, 1000);
                    return;
                }
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include"
            });
            const result = await response.json();

            if (result.success) {
                showToast('로그아웃 되었습니다.');
                setTimeout(() => {
                    document.body.style.transition = 'opacity 0.4s ease';
                    document.body.style.opacity = '0';
                    setTimeout(() => window.location.href = "/", 400);
                }, 1000);
            } 
        });
    }

    // 마이페이지
    const mypageBtn = document.getElementById("mypageBtn");
    if (!mypageBtn) return;

    mypageBtn.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/auth/mypage");
            const result = await response.json();

            if (!result.success) {
                window.showToast('🔒 로그인이 필요합니다');
                setTimeout(() => window.location.href = '/login', 1000);
                return; 
            }

            const profileId = result.user.profileId;
            window.location.href = `/mypage?profileId=${encodeURIComponent(profileId)}`;
        } catch (error) {
            console.error(error);
            window.showToast('🔒 로그인이 필요합니다');
        }
    });

    //ai챗봇
    const aichatBtn = document.getElementById("aichatBtn");
    if(!aichatBtn) return;

    aichatBtn.addEventListener("click", async ()=> {
        try {
            const response = await fetch("/api/auth/mypage");
            const result = await response.json();

            if(!result.success) {
                window.showToast('🔒 로그인이 필요합니다');
                setTimeout(() => window.location.href = '/login', 1000);
                return;
            }

            document.getElementById('aichatModalOverlay').style.display = 'flex';
        } catch (error) {
            console.error(error);
            window.showToast('🔒 로그인이 필요합니다');
        }
    
    });

    //배너창
    const trendThemes = [
        { text: "🔥 요즘 유행하는 오버핏 코디" , url: "/trend/oversized"},
        { text:  "☀️ 오늘 날씨에 맞는 코디", url: "/trend/weather"},
        { text:  "🍂 가을 감성 코디 모음", url: "/trend/autumn"}
    ];
    let currentThemeIndex = 0;

    function rotateTrendBanner() {
        currentThemeIndex = (currentThemeIndex + 1) % trendThemes.length;
        const banner = document.getElementById('trendBanner');
        const textEl = document.getElementById('trendBannerText');

        banner.style.opacity = '0';
        setTimeout(() => {
            textEl.textContent = trendThemes[currentThemeIndex].text;
            banner.style.opacity = '1';
        }, 400);
    }

    setInterval(rotateTrendBanner, 5000);

    function goToTrendPage(){
        window.location.href = trendThemes[currentThemeIndex].url;
    }
});

let trendThemes = [];
let currentThemeIndex = 0;

async function loadBanners() {
    try {
        const res = await fetch('/api/banners/active');
        const data = await res.json();
        trendThemes = data.map(b => ({ text: b.TEXT, url: b.LINK_URL }));

        if (trendThemes.length > 0) {
            document.getElementById('trendBannerText').textContent = trendThemes[0].text;
            document.getElementById('trendBanner').style.display = 'block';
            setInterval(rotateTrendBanner, 5000);
        }
    } catch (err) {
        console.error('배너 로드 실패:', err);
    }
}

function rotateTrendBanner() {
    currentThemeIndex = (currentThemeIndex + 1) % trendThemes.length;
    const banner = document.getElementById('trendBanner');
    const textEl = document.getElementById('trendBannerText');

    banner.style.opacity = '0';
    setTimeout(() => {
        textEl.textContent = trendThemes[currentThemeIndex].text;
        banner.style.opacity = '1';
    }, 400);
}

function goToTrendPage() {
    window.location.href = trendThemes[currentThemeIndex].url; 
}

loadBanners();