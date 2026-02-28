const chatEl = document.getElementById('chat');
const formEl = document.getElementById('form');
const inputEl = document.getElementById('message');
const quickActionsEl = document.getElementById('quickActions');

let userName = '';

function addMessage(text, sender = 'bot') {
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function sendToBot(message) {
  addMessage(message, 'user');
  const loading = document.createElement('div');
  loading.className = 'msg bot';
  loading.textContent = 'Escribiendo...';
  chatEl.appendChild(loading);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userName })
    });

    const data = await response.json();
    loading.remove();
    addMessage(data.reply || data.error || 'No pude responder en este momento.');
  } catch (_error) {
    loading.remove();
    addMessage('Hubo un problema de conexión con el asistente.');
  }
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';

  if (!userName) {
    userName = text;
    addMessage(text, 'user');
    addMessage(`¡Mucho gusto, ${userName}! 👋\nPuedo mostrarte todo el plan, sugerirte opciones concretas o conversar sobre cualquier duda que te haya surgido.\nSi querés, contame qué aspecto te interesa y lo vemos juntos.`);
    return;
  }

  await sendToBot(text);
});

quickActionsEl.addEventListener('click', async (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  if (!userName) {
    addMessage('Antes de avanzar, contame tu nombre 😊');
    return;
  }

  await sendToBot(button.dataset.question);
});

addMessage('¡Hola! Soy el asistente del plan de trabajo de Martín para Product Owner de BIT. 👋');
addMessage('Primero, ¿cómo te llamás?');
