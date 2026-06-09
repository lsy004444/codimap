const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const axios   = require('axios');
const db      = require('../config/db');


const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
    const uniqueName = Date.now() + '_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
}
});

const fileFilter = function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
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


async function coordToAddress(latitude, longitude) {
    try {
        const response = await axios.get(
            'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json',
            {
                params: { x: longitude, y: latitude },
                headers: {
                    Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
                }
            }
        );

        const documents = response.data.documents;
        if (!documents || documents.length === 0) return null;

       
        const region = documents.find(d => d.region_type === 'H') || documents[0];

        return {
            city:    region.region_1depth_name, 
            country: region.region_2depth_name, 
            name:    region.region_3depth_name,
            latitude,
            longitude
        };
    } catch (err) {
        console.error('카카오 API 오류:', err.message);
        return null;
    }
}


async function getOrCreateRegion(regionData) {
    const { city, country, name, latitude, longitude } = regionData;

 
    const [existing] = await db.query(
        'SELECT REGION_ID FROM REGION WHERE CITY = ? AND COUNTRY = ? AND REGION_NAME = ?',
        [city, country, name]
    );

    if (existing.length > 0) {
        return existing[0].REGION_ID;
    }


    const [result] = await db.query(
        'INSERT INTO REGION (REGION_NAME, CITY, COUNTRY, LATITUDE, LONGITUDE) VALUES (?, ?, ?, ?, ?)',
        [name, city, country, latitude, longitude]
    );

    return result.insertId;
}


router.post('/register', upload.array('images', 10), async (req, res) => {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

       
        const files       = req.files;
        const description = req.body.description;
        const season      = req.body.season || null;
        const memberId    = req.session.user.userId;
        const location    = req.body.location ? JSON.parse(req.body.location) : null;
        const links       = req.body.links    ? JSON.parse(req.body.links)    : [];
        const latitude    = req.body.latitude  ? parseFloat(req.body.latitude)  : null;
        const longitude   = req.body.longitude ? parseFloat(req.body.longitude) : null;

        console.log('위도:', latitude, '경도:', longitude); // 추가

    
        if (!files || files.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: '사진을 업로드해주세요.' });
        }
        if (!description) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: '게시물 설명을 입력해주세요.' });
        }

 
        let regionId = null;

        if (latitude && longitude) {
       
            const regionData = await coordToAddress(latitude, longitude);
            if (regionData) {
                regionId = await getOrCreateRegion(regionData);
            }
        } else if (location) {
            
            const regionData = {
                city:      location.sido    || '',
                country:   location.sigungu || '',
                name:      location.bname   || '',
                latitude:  null,
                longitude: null
            };
            regionId = await getOrCreateRegion(regionData);
        }

       
        const [postResult] = await conn.query(
            'INSERT INTO POST (CONTENT, SEASON, MEMBER_ID, REGION_ID) VALUES (?, ?, ?, ?)',
            [description, season, memberId, regionId]
        );
        const postId = postResult.insertId;

        
        for (const file of files) {
            const imageUrl = `/uploads/${file.filename}`;
            await conn.query(
                'INSERT INTO IMAGE (URL, POST_ID) VALUES (?, ?)',
                [imageUrl, postId]
            );
        }

       
        for (const link of links) {
            if (link.url && link.url.trim() !== '') {
                await conn.query(
                    'INSERT INTO POST_LINK (URL, POST_ID, AFFILIATE) VALUES (?, ?, ?)',
                    [link.url.trim(), postId, link.affiliate ? 1 : 0]
                );
            }
        }

        await conn.commit();

        console.log(`게시물 등록 완료 - POST_ID: ${postId}`);

        res.json({
            success: true,
            message: '게시물이 등록되었습니다.',
            postId
        });

    } catch (err) {
        await conn.rollback();
        console.error('게시물 등록 오류:', err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    } finally {
        conn.release();
    }
});

// 게시물 상세 조회
router.get('/detail/:id', async (req, res) => {
    const postId = req.params.id;
    
    try {
        const [results] = await db.query(
    `SELECT P.*, 
        R.REGION_NAME, R.CITY, R.COUNTRY,
        CONCAT(R.CITY, ' ', R.COUNTRY, ' ', R.REGION_NAME) AS LOCATION,
        GROUP_CONCAT(DISTINCT I.URL ORDER BY I.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
        GROUP_CONCAT(DISTINCT PL.URL ORDER BY PL.LINK_ID SEPARATOR '||') AS LINK_URLS
     FROM POST P
     LEFT JOIN REGION R ON P.REGION_ID = R.REGION_ID
     LEFT JOIN IMAGE I ON P.POST_ID = I.POST_ID
     LEFT JOIN POST_LINK PL ON P.POST_ID = PL.POST_ID
     WHERE P.POST_ID = ?
     GROUP BY P.POST_ID`,
    [postId]
);

        if (!results || results.length === 0) {
            return res.json({ success: false, message: '존재하지 않는 게시물입니다.' });
        }

        return res.json({ success: true, post: results[0] });

    } catch (err) {
        console.error('상세조회 오류:', err);
        return res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

// 게시물 삭제
router.delete('/delete/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        await db.query('DELETE FROM POST_LINK WHERE POST_ID = ?', [postId]);
        await db.query('DELETE FROM IMAGE WHERE POST_ID = ?', [postId]);
        const [result] = await db.query('DELETE FROM POST WHERE POST_ID = ?', [postId]);

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: '이미 삭제되었거나 존재하지 않는 게시물입니다.' });
        }

        return res.json({ success: true, message: '삭제되었습니다.' });

    } catch (err) {
        console.error('삭제 오류:', err);
        return res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

module.exports = router;

