const axios = require('axios');

// Open-Meteo: 무료, API 키 불필요 (https://open-meteo.com)
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

const weatherCache = new Map(); // key: "lat,lng" -> { data, fetchedAt }
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

const WEATHER_CODE_INFO = {
    0: { desc: '맑음', icon: '☀️' },
    1: { desc: '대체로 맑음', icon: '🌤️' },
    2: { desc: '부분 흐림', icon: '⛅' },
    3: { desc: '흐림', icon: '☁️' },
    45: { desc: '안개', icon: '🌫️' },
    48: { desc: '안개', icon: '🌫️' },
    51: { desc: '이슬비', icon: '🌦️' },
    53: { desc: '이슬비', icon: '🌦️' },
    55: { desc: '이슬비', icon: '🌦️' },
    61: { desc: '비', icon: '🌧️' },
    63: { desc: '비', icon: '🌧️' },
    65: { desc: '강한 비', icon: '🌧️' },
    71: { desc: '눈', icon: '🌨️' },
    73: { desc: '눈', icon: '🌨️' },
    75: { desc: '강한 눈', icon: '🌨️' },
    80: { desc: '소나기', icon: '🌦️' },
    81: { desc: '소나기', icon: '🌦️' },
    82: { desc: '강한 소나기', icon: '⛈️' },
    95: { desc: '뇌우', icon: '⛈️' },
    96: { desc: '뇌우(우박)', icon: '⛈️' },
    99: { desc: '뇌우(우박)', icon: '⛈️' },
};

// 계절별 평균 기온(한국 기준 대략치) — 오늘 기온과 가장 가까운 계절을 "오늘의 계절"로 매칭
const SEASON_TEMP_AVG = { '봄': 13, '여름': 26, '가을': 16, '겨울': 2 };

function tempToSeason(temp) {
    let best = '봄';
    let bestDiff = Infinity;
    for (const [season, avg] of Object.entries(SEASON_TEMP_AVG)) {
        const diff = Math.abs(temp - avg);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = season;
        }
    }
    return best;
}

function cacheKey(lat, lng) {
    return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

// 오늘 해당 위치의 실시간 날씨를 반환 (기온, 날씨코드, 설명, 매칭 계절)
async function getCurrentWeather(lat, lng) {
    const key = cacheKey(lat, lng);
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
    }

    const { data } = await axios.get(WEATHER_API_URL, {
        params: {
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,weather_code',
            timezone: 'Asia/Seoul',
        },
        timeout: 4000,
    });

    const temperature = data?.current?.temperature_2m;
    const weatherCode = data?.current?.weather_code;
    const info = WEATHER_CODE_INFO[weatherCode] || { desc: '', icon: '' };

    const result = {
        temperature: typeof temperature === 'number' ? temperature : null,
        weatherCode: weatherCode ?? null,
        description: info.desc,
        icon: info.icon,
        matchedSeason: typeof temperature === 'number' ? tempToSeason(temperature) : null,
    };

    weatherCache.set(key, { data: result, fetchedAt: Date.now() });
    return result;
}

module.exports = { getCurrentWeather, tempToSeason, SEASON_TEMP_AVG };
