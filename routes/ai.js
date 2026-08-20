const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const db = require('../config/db');

router.post('/recommend', async (req, res) => {
  const { question, season, gender, style } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `너는 코디맵의 AI 코디 추천 어시스턴트야. 
    계절(${season}), 성별(${gender}),  스타일(${style}) 정보를 참고해서 구체적이고 실용적인 코디를 추천해줘. 한국어로 친근하게 답변해.
    규칙:
    - 마크다운 문법(#, *, - 등) 쓰지 말고 일반 텍스트로만 답변
    - 상의/하의/신발/포인트 아이템 순서로 간결하게
    - 이모지는 사용하되, 너무 많이는 사용 금지
    사용자 질문: ${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    const matchedPosts = await findMatchingPosts(season);

    res.json({
    answer,
    images: matchedPosts.map(p => p.URL)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI 추천 생성 실패' });
  }
});

async function findMatchingPosts(season, limit = 3) {
  const [rows] = await db.query(
    `SELECT p.POST_ID, i.URL
     FROM POST p
     JOIN IMAGE i ON p.POST_ID = i.POST_ID
     WHERE p.SEASON = ?
     ORDER BY p.POST_ID DESC
     LIMIT ?`,
    [season, limit]
  );
  return rows;
}
module.exports = router;