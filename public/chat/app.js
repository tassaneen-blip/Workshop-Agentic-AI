(() => {
  const history = [], messages = document.querySelector('#messages');
  const add = (role, content) => { const el = document.createElement('div'); el.className = `bubble ${role}`; el.textContent = content; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; };
  document.querySelector('#form').addEventListener('submit', async (event) => {
    event.preventDefault(); const input = document.querySelector('#message'); const message = input.value.trim(); if (!message) return;
    const provider = document.querySelector('#provider').value; const model = document.querySelector('#model').value.trim(); input.value = ''; add('user', message);
    const button = event.currentTarget.querySelector('button'); button.disabled = true;
    try { const response = await fetch('/api/chat', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ message, history, provider, model }) }); const data = await response.json(); const reply = data.reply || data.error || 'ไม่พบข้อความตอบกลับ'; add('assistant', reply); history.push({role:'user',content:message},{role:'assistant',content:reply}); }
    catch (error) { add('assistant', 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่'); } finally { button.disabled = false; input.focus(); }
  });
})();