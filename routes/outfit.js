const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // npm install axios 필요
const db = require('../config/db')


const KAKAO_REST_API_KEY = '988a3ef9bdd9a2dfec45d530f1debc0a'; 


const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '_' + file.originalname;
        cb(null, uniqueName);
    }
});


const fileFilter = function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});


router.post('/register', upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: '사진을 업로드해주세요.' });
        }

       
        const imagePaths = files.map(file => `/uploads/${file.filename}`);

       
        const description = req.body.description;
        const links = req.body.links ? JSON.parse(req.body.links) : [];
        const location = req.body.location ? JSON.parse(req.body.location) : null;

        console.log('📝 글 설명:', description);
        console.log('🔗 쇼핑몰 링크 리스트:', links);
        console.log('📍 프론트에서 넘겨준 위치 데이터:', location);

        let finalRegion = { si: '', gu: '', dong: '' };

       
        if (location && location.lat && location.lng) {
          
            try {
                const kakaoResponse = await axios.get('https://dapi.kakao.com/v2/local/geo/coord2regioncode.json', {
                    headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` },
                    params: { x: location.lng, y: location.lat }
                });

             
                const regionInfo = kakaoResponse.data.documents.find(doc => doc.region_type === 'H');
                if (regionInfo) {
                    finalRegion.si = regionInfo.region_1depth_name; 
                    finalRegion.gu = regionInfo.region_2depth_name; 
                    finalRegion.dong = regionInfo.region_3depth_name; 
                }
            } catch (kakaoErr) {
                console.error('카카오 API 호출 실패:', kakaoErr);
              
            }
        } 
        
        if (!finalRegion.dong && location && location.address) {
        
            const addrParts = location.address.split(' ');
            finalRegion.si = addrParts[0] || '';
            finalRegion.gu = addrParts[1] || '';
            finalRegion.dong = addrParts[2] || ''; 
        }

        console.log('📌 최종 필터링된 주소:', finalRegion);

       

        res.json({ 
            success: true, 
            message: '데이터 파싱 및 주소 추출 성공!',
            region: finalRegion,
            images: imagePaths 
        });

    } catch (err) {
        console.error('업로드 오류:', err);
        res.status(500).json({ success: false, message: '업로드 중 오류가 발생했습니다.' });
    }
});
    
module.exports = router;