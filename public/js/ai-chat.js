async function sendMessage() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const question = input.value.trim();
  if (!question) return;

  appendMessage('user', question);
  input.value = '';
  sendBtn.disabled = true;

  const loadingMsg = appendMessage('ai', '생각 중...');

  try {
    const res = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        season: '여름',
        gender: '여성',
        style: '캐주얼'
      })
    });
    const data = await res.json();
    loadingMsg.textContent = data.answer || '답변을 가져오지 못했어요.';

    if (data.images && data.images.length > 0) {
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = 'display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;';

    data.images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'width:120px; height:120px; object-fit:cover; border-radius:8px; cursor:pointer;';
        imgContainer.appendChild(img);
    });

    loadingMsg.parentElement.appendChild(imgContainer);
    }
    } catch (err) {
    loadingMsg.textContent = '오류가 발생했어요. 다시 시도해주세요.';
  } finally {
    sendBtn.disabled = false;
  }
}

function appendMessage(sender, text) {
  const box = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;
  msg.textContent = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  return msg;
}