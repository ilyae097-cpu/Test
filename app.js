// Задачи хранятся только в этом браузере, а не на GitHub или на сервере.
const STORAGE_KEY = 'little-steps.tasks.v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const filters = document.querySelectorAll('[data-filter]');
const clearButton = document.querySelector('#clear-completed');
const storageMessage = document.querySelector('#storage-message');
let currentFilter = 'all';
let tasks = loadTasks();
const effectsButton = document.querySelector('#effects-toggle');
const mascotStage = document.querySelector('#mascot-stage');
const reaction = document.querySelector('#reaction-text');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const EFFECTS_KEY = 'zhepka.effects.v1';
let effectsEnabled = true;
let celebrationTimer;
let celebrationNumber = 0;
try {
  effectsEnabled = localStorage.getItem(EFFECTS_KEY) !== 'off';
} catch { /* Настройка работает и без доступа к хранилищу. */ }

function updateEffectsButton() {
  effectsButton.setAttribute('aria-pressed', effectsEnabled);
  effectsButton.textContent = `Эффекты: ${effectsEnabled ? 'вкл.' : 'выкл.'}`;
}

function stopCelebration() {
  clearTimeout(celebrationTimer);
  mascotStage.classList.remove('is-slapping');
}

function celebrate() {
  const phrases = [
    'ШЛЁП! Минус дело, плюс уважение.',
    'Критический шлёп! Прокрастинация повержена.',
    'Сугой! Жепка тобой гордится.',
    'Ещё одна победа. Персик в восторге!',
  ];
  reaction.textContent = phrases[celebrationNumber++ % phrases.length];
  stopCelebration();
  if (!effectsEnabled || reducedMotion.matches) return;
  // Перезапускаем короткую анимацию даже при быстрых повторных отметках.
  void mascotStage.offsetWidth;
  mascotStage.classList.add('is-slapping');
  celebrationTimer = setTimeout(stopCelebration, 900);
}

effectsButton.addEventListener('click', () => {
  effectsEnabled = !effectsEnabled;
  if (!effectsEnabled) stopCelebration();
  try {
    localStorage.setItem(EFFECTS_KEY, effectsEnabled ? 'on' : 'off');
  } catch { /* Задачи и переключатель остаются доступны. */ }
  updateEffectsButton();
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) stopCelebration();
});
updateEffectsButton();

function warnAboutStorage() {
  storageMessage.textContent = 'Сохранение недоступно. Задачи останутся только до закрытия или обновления страницы.';
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) throw new Error('Некорректные данные');
    const ids = new Set();
    return stored.filter(task => {
      if (!task || typeof task.id !== 'string' || ids.has(task.id) ||
          typeof task.text !== 'string' || !task.text.trim() ||
          task.text.length > 200 || typeof task.completed !== 'boolean') return false;
      ids.add(task.id);
      return true;
    });
  } catch {
    warnAboutStorage();
    return [];
  }
}

function saveAndRender() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageMessage.textContent = 'Задачи сохраняются в этом браузере · Жепка ничего не сливает';
  } catch {
    warnAboutStorage();
  }
  render();
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  const visible = tasks.filter(task => currentFilter === 'all' ||
    (currentFilter === 'completed' ? task.completed : !task.completed));
  list.replaceChildren();

  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' completed' : ''}`;
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      saveAndRender();
      if (task.completed) celebrate();
      const nextRow = [...list.children].find(item => item.dataset.id === task.id);
      (nextRow?.querySelector('input') || filtersForCurrent()).focus();
    });
    const title = document.createElement('span');
    title.className = 'task-title';
    // textContent показывает введённый текст как текст, не исполняя HTML.
    title.textContent = task.text;
    label.append(checkbox, title);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveAndRender();
      input.focus();
    });
    row.dataset.id = task.id;
    row.append(label, remove);
    list.append(row);
  }

  document.querySelector('#total-count').textContent = tasks.length;
  document.querySelector('#empty-state').hidden = visible.length > 0;
  const emptyMessages = {
    all: ['Новый квест сам себя не запишет', 'Добавь дело. Выполни его. Получи свой «шлёп!».'],
    active: ['Все боссы повержены!', 'Жепка отдыхает. Ты тоже заслужил перерыв.'],
    completed: ['Здесь будут твои победы', 'Поставь первую галочку — персик уже ждёт.'],
  };
  document.querySelector('#empty-title').textContent = emptyMessages[currentFilter][0];
  document.querySelector('#empty-description').textContent = emptyMessages[currentFilter][1];
  document.querySelector('#progress-text').textContent = tasks.length
    ? `Готово ${completed} из ${tasks.length} · Осталось: ${tasks.length - completed}`
    : 'Пока нет задач';
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#progress').setAttribute('aria-valuenow', percent);
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  clearButton.hidden = completed === 0;
  filters.forEach(button => button.setAttribute('aria-pressed', button.dataset.filter === currentFilter));
}

function filtersForCurrent() {
  return document.querySelector(`[data-filter="${currentFilter}"]`);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || text.length > 200) {
    input.focus();
    return;
  }
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  tasks.push({ id, text, completed: false });
  // Новая задача должна быть видна и при добавлении из вкладки «Готово».
  currentFilter = 'all';
  input.value = '';
  saveAndRender();
  input.focus();
});

filters.forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  render();
}));

clearButton.addEventListener('click', () => {
  tasks = tasks.filter(task => !task.completed);
  saveAndRender();
  filtersForCurrent().focus();
});

render();
