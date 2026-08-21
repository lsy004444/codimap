async function sendAIMessage() {
  const input = document.getElementById('aiChatInput');
  const aiChatSendBtn = document.getElementById('aiChatSendBtn');
  const question = input.value.trim();
  if (!question) return;

  appendMessage('user', question);
  input.value = '';
  aiChatSendBtn.disabled = true;

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

    data.images.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'width:100px; height:100px; object-fit:cover; border-radius:8px; cursor:pointer;';
    img.onclick = () => {
      if (data.postIds && data.postIds[idx]) {
        window.location.href = `/detail/${data.postIds[idx]}`;
      }
    };
  imgContainer.appendChild(img);
});

    loadingMsg.parentElement.appendChild(imgContainer);
    }
    } catch (err) {
    loadingMsg.textContent = '오류가 발생했어요. 다시 시도해주세요.';
  } finally {
    aiChatSendBtn.disabled = false;
  }
}


function appendMessage(sender, text) {
  const box = document.getElementById('aiChatMessages');

  const row = document.createElement('div');
  row.className = `chat-row ${sender}`;

  if (sender === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = '🤖';
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  row.appendChild(bubble);

  box.appendChild(row);
  box.scrollTop = box.scrollHeight;

  return bubble;
}