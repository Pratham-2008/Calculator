(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const expressionEl = $('#expression');
  const resultEl = $('#result');
  const expressionLabel = $('#expressionLabel');
  const memoryIndicator = $('#memoryIndicator');
  const scientificKeys = $('#scientificKeys');
  const historyPanel = $('#historyPanel');
  const historyList = $('#historyList');
  const state = { expression: '', answer: '', mode: 'standard', angle: 'DEG', history: JSON.parse(localStorage.getItem('lumina-history') || '[]'), memory: null, justCalculated: false };

  function render() {
    expressionEl.textContent = state.expression || '0';
    resultEl.textContent = state.answer || '0';
    expressionLabel.textContent = state.justCalculated ? 'Result' : (state.expression ? 'Calculating' : 'Ready');
    memoryIndicator.textContent = state.memory === null ? 'No memory' : `M = ${formatNumber(state.memory)}`;
    scientificKeys.classList.toggle('visible', state.mode === 'scientific');
    document.querySelectorAll('.mode-button').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
    $('#angleToggle').textContent = state.angle;
    renderHistory();
  }
  function formatNumber(value) {
    if (!Number.isFinite(value)) return 'Error';
    const rounded = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12));
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 10, useGrouping: false });
  }
  function normalize(input) {
    return input.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('π', 'PI').replace(/\be\b/g, 'E').replace(/(\d|\))(?=\()/g, '$1*').replace(/(\d|\))(?=(PI|E))/g, '$1*');
  }
  function factorial(n) { if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('Factorial is limited to whole numbers up to 170'); let total = 1; for (let i = 2; i <= n; i += 1) total *= i; return total; }
  function evaluate(input) {
    let expression = normalize(input).replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    expression = expression.replace(/(\d+(?:\.\d+)?)!/g, 'factorial($1)');
    expression = expression.replace(/\^/g, '**');
    const toRadians = (value) => state.angle === 'DEG' ? value * Math.PI / 180 : value;
    const sin = (value) => Math.sin(toRadians(value));
    const cos = (value) => Math.cos(toRadians(value));
    const tan = (value) => Math.tan(toRadians(value));
    const scope = { sin, cos, tan, log: Math.log10, ln: Math.log, sqrt: Math.sqrt, factorial, PI: Math.PI, E: Math.E };
    if (!/^[0-9+\-*/().,\sA-Za-z_*]+$/.test(expression) || /(?:constructor|prototype|window|document|globalThis|alert|eval|Function)/i.test(expression)) throw new Error('Invalid expression');
    const result = Function(...Object.keys(scope), `"use strict"; return (${expression})`)(...Object.values(scope));
    if (!Number.isFinite(result)) throw new Error('Math error');
    return result;
  }
  function preview() {
    if (!state.expression) { state.answer = ''; render(); return; }
    try { state.answer = formatNumber(evaluate(state.expression)); } catch { state.answer = '…'; render(); }
    render();
  }
  function insert(value) {
    if (state.justCalculated && /[0-9.(πa-z]/i.test(value)) state.expression = '';
    state.justCalculated = false;
    const last = state.expression.slice(-1);
    if (['+', '−', '×', '÷', '^'].includes(value) && ['+', '−', '×', '÷', '^'].includes(last)) state.expression = state.expression.slice(0, -1);
    if (value === '.' && (last === '.' || /\d+\.\d*$/.test(state.expression))) return;
    state.expression += value;
    preview();
  }
  function calculate() {
    if (!state.expression) return;
    try { const value = evaluate(state.expression); state.answer = formatNumber(value); addHistory(state.expression, state.answer); state.expression = state.answer; state.justCalculated = true; render(); }
    catch (error) { state.answer = error.message || 'Error'; state.justCalculated = true; render(); }
  }
  function clear() { state.expression = ''; state.answer = ''; state.justCalculated = false; render(); }
  function backspace() { state.justCalculated = false; state.expression = state.expression.slice(0, -1); preview(); }
  function toggleSign() { if (!state.expression) return insert('−'); if (/^-?\d+(?:\.\d+)?$/.test(state.expression)) state.expression = state.expression.startsWith('−') ? state.expression.slice(1) : `−${state.expression}`; preview(); }
  function percent() { if (state.expression) { state.expression += '%'; preview(); } }
  function addHistory(expression, answer) { state.history.unshift({ expression, answer, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }); state.history = state.history.slice(0, 12); localStorage.setItem('lumina-history', JSON.stringify(state.history)); }
  function renderHistory() { if (!state.history.length) { historyList.innerHTML = '<div class="empty-history"><span>⌁</span><p>Your calculations will appear here.</p></div>'; return; } historyList.innerHTML = state.history.map((item, index) => `<div class="history-item" data-history-index="${index}" tabindex="0"><div class="history-expression">${escapeHtml(item.expression)}</div><div class="history-answer">= ${escapeHtml(item.answer)}</div><div class="history-time">${item.time}</div></div>`).join(''); }
  function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char])); }
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => { const action = button.dataset.action; if (action === 'insert') insert(button.dataset.value); if (action === 'calculate') calculate(); if (action === 'clear') clear(); if (action === 'backspace') backspace(); if (action === 'sign') toggleSign(); if (action === 'percent') percent(); }));
  document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => { state.mode = button.dataset.mode; render(); }));
  $('#angleToggle').addEventListener('click', () => { state.angle = state.angle === 'DEG' ? 'RAD' : 'DEG'; preview(); });
  $('#themeToggle').addEventListener('click', () => { const light = document.body.dataset.theme === 'light'; document.body.dataset.theme = light ? 'dark' : 'light'; $('#themeToggle').textContent = light ? '☼' : '☾'; $('#themeToggle').setAttribute('aria-label', light ? 'Switch to light theme' : 'Switch to dark theme'); localStorage.setItem('lumina-theme', document.body.dataset.theme); });
  $('#historyToggle').addEventListener('click', () => { const hidden = historyPanel.classList.toggle('history-hidden'); $('#historyToggle').setAttribute('aria-expanded', String(!hidden)); });
  $('#clearHistory').addEventListener('click', () => { state.history = []; localStorage.removeItem('lumina-history'); render(); });
  historyList.addEventListener('click', (event) => { const item = event.target.closest('[data-history-index]'); if (item) { state.expression = state.history[item.dataset.historyIndex].answer; state.justCalculated = false; preview(); } });
  document.addEventListener('keydown', (event) => { if (event.ctrlKey || event.metaKey || event.altKey) return; const keyMap = { '*':'×', '/':'÷', '-':'−' }; if (/\d/.test(event.key) || ['+', '.', '(', ')', '^'].includes(event.key)) { event.preventDefault(); insert(event.key); } else if (keyMap[event.key]) { event.preventDefault(); insert(keyMap[event.key]); } else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); calculate(); } else if (event.key === 'Backspace') { event.preventDefault(); backspace(); } else if (event.key === 'Escape' || event.key === 'Delete') { event.preventDefault(); clear(); } });
  document.body.dataset.theme = localStorage.getItem('lumina-theme') || 'dark'; if (document.body.dataset.theme === 'light') $('#themeToggle').textContent = '☾'; render();
})();
