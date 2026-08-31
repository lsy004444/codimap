// ──────────────────────────────────────────
// 마이그레이션 실행기
//
//   사용법:
//     node db/migrate.js --check                     현재 스키마 상태만 확인 (변경 없음)
//     node db/migrate.js db/migrations/001_....sql   해당 파일 실행
//
//   .env 의 접속 정보를 그대로 쓴다 (config/db.js 재사용).
//   여러 문(statement)을 세미콜론으로 나눠 순서대로 실행한다.
// ──────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function showState() {
    const [cols] = await db.query("SHOW COLUMNS FROM POST");
    const hasTopic = cols.some(c => c.Field === 'TOPIC');
    const [idx] = await db.query("SHOW INDEX FROM POST");
    const hasIdx = idx.some(i => i.Key_name === 'IDX_POST_TOPIC');

    console.log('POST 컬럼      :', cols.map(c => c.Field).join(', '));
    console.log('TOPIC 컬럼     :', hasTopic ? '있음 ✓' : '없음');
    console.log('IDX_POST_TOPIC :', hasIdx ? '있음 ✓' : '없음');

    if (hasTopic) {
        const [[n]] = await db.query(
            "SELECT COUNT(*) total, SUM(TOPIC IS NOT NULL) community FROM POST"
        );
        console.log(`게시물         : 총 ${n.total}건 (커뮤니티 ${n.community || 0}건)`);
    }
}

async function main() {
    const arg = process.argv[2];

    if (!arg || arg === '--check') {
        await showState();
        return;
    }

    const file = path.resolve(arg);
    const sql = fs.readFileSync(file, 'utf8');

    // 주석 제거 후 세미콜론 기준 분리
    const statements = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

    console.log(`실행 전 상태 ─────────────`);
    await showState();

    console.log(`\n${path.basename(file)} — ${statements.length}개 문 실행`);
    for (const [i, stmt] of statements.entries()) {
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
        try {
            await db.query(stmt);
            console.log(`  [${i + 1}] OK   ${preview}...`);
        } catch (e) {
            // 이미 적용된 마이그레이션을 다시 돌려도 죽지 않게
            if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(e.code)) {
                console.log(`  [${i + 1}] SKIP ${preview}... (이미 적용됨)`);
            } else {
                console.error(`  [${i + 1}] FAIL ${preview}...`);
                throw e;
            }
        }
    }

    console.log(`\n실행 후 상태 ─────────────`);
    await showState();
}

main()
    .then(() => process.exit(0))
    .catch(err => { console.error('\n마이그레이션 실패:', err.message); process.exit(1); });
