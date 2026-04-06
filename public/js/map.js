
window.onload = function() {
    kakao.maps.load(function() {
        var container = document.getElementById('map');
        var options = {
            center: new kakao.maps.LatLng(37.5665, 126.9780),
            level: 3
        };
        var map = new kakao.maps.Map(container, options);
    });
};