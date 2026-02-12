/**
 * Daily Logger v2 - Final Corrected Version
 * Features: Auto-save, UUID, Tag Capsules, Atomic Habits, and Full History UI.
 * Refined: Auto-sorting (Complete to bottom, Uncheck to top)
 */

let container;
let isLoading = false;
let isModified = false;
let saveTimer = null;
const SAVE_DELAY = 1200;

// --- 基礎工具 ---
const generateUUID = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

window.onload = async () => {
    container = document.getElementById('todo-container');
    if (container) {
        new Sortable(container, {
            animation: 300, // 稍微拉長動畫，讓自動重排更平滑
            handle: '.drag-handle',
            ghostClass: 'ghost',
            onEnd: () => triggerAutoSave()
        });

        container.addEventListener('input', (e) => {
            if (!e.target.classList.contains('ghost-tag-input')) {
                isModified = true;
                triggerAutoSave();
            }
        });
    }

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = (new Date(now - offset)).toISOString().split('T')[0];
    const datePicker = document.getElementById('date-picker');
    if(datePicker) datePicker.value = localDate;

    transformSaveButtonToStatus();

    await Promise.all([
        loadDateLogs(localDate),
        typeof initHabits === 'function' ? initHabits(localDate) : Promise.resolve()
    ]);
};

// --- 全域變數與API ---
async function handleDateChange(newDate) {
    if (isLoading) return;
    if (isModified) await saveToBackend();
    await Promise.all([
        loadDateLogs(newDate),
        typeof initHabits === 'function' ? initHabits(newDate) : Promise.resolve()
    ]);
}

// --- 標籤膠囊系統 (Unified) ---

function createTagCapsule(tagText, tagContainer) {
    if (!tagText.trim()) return;
    const existing = Array.from(tagContainer.querySelectorAll('.tag-text')).map(t => t.innerText);
    if (existing.includes(tagText)) return;

    const capsule = document.createElement('span');
    capsule.className = 'tag-capsule';
    capsule.innerHTML = `<span class="tag-text">${tagText}</span><i class="fa-solid fa-xmark delete-tag" style="margin-left:4px; font-size:9px;"></i>`;

    capsule.querySelector('.delete-tag').onclick = (e) => {
        e.stopPropagation();
        capsule.remove();
        triggerAutoSave();
    };

    const input = tagContainer.querySelector('.ghost-tag-input');
    tagContainer.insertBefore(capsule, input);
}

// ✅ 優化：處理按鍵觸發標籤
function handleTagInput(event, inputEl) {
    const tagContainer = inputEl.closest('.tag-container');
    const val = inputEl.value.trim();

    // Space (空白) 或 Enter 觸發
    if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (val) {
            createTagCapsule(val, tagContainer);
            inputEl.value = '';
            triggerAutoSave();
        }
    } else if (event.key === 'Backspace' && !inputEl.value) {
        const capsules = tagContainer.querySelectorAll('.tag-capsule');
        if (capsules.length > 0) {
            capsules[capsules.length - 1].remove();
            triggerAutoSave();
        }
    }
}

// ✅ 新增：移開游標 (Blur) 自動轉膠囊
function handleTagBlur(inputEl) {
    const tagContainer = inputEl.closest('.tag-container');
    const val = inputEl.value.trim();
    if (val) {
        createTagCapsule(val, tagContainer);
        inputEl.value = '';
        triggerAutoSave();
    }
}

// --- 自動儲存 ---
function triggerAutoSave() {
    updateStatus('editing');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveToBackend(), SAVE_DELAY);
}

function transformSaveButtonToStatus() {
    const btn = document.querySelector('button[onclick="saveToBackend()"]');
    if (btn) {
        btn.removeAttribute('onclick');
        btn.id = 'status-indicator';
        btn.className = 'px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-xs bg-gray-100 text-gray-400';
        btn.innerHTML = `<i class="fa-solid fa-cloud"></i> <span>READY</span>`;
    }
}

function updateStatus(state) {
    const el = document.getElementById('status-indicator');
    if (!el) return;
    switch(state) {
        case 'editing':
            el.className = 'px-4 py-2 rounded-xl bg-amber-50 text-amber-500 font-bold text-xs';
            el.innerHTML = `<i class="fa-solid fa-pen fa-beat-fade"></i> <span>EDITING</span>`;
            break;
        case 'saving':
            el.className = 'px-4 py-2 rounded-xl bg-blue-50 text-blue-500 font-bold text-xs';
            el.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>SAVING</span>`;
            break;
        case 'saved':
            el.className = 'px-4 py-2 rounded-xl bg-green-50 text-green-600 font-bold text-xs';
            el.innerHTML = `<i class="fa-solid fa-check"></i> <span>SYNCED</span>`;
            setTimeout(() => {
                if(!isModified && el.innerHTML.includes('SYNCED')) {
                    el.className = 'px-4 py-2 rounded-xl bg-gray-50 text-gray-300 font-bold text-xs';
                }
            }, 2000);
            break;
        case 'error':
            el.className = 'px-4 py-2 rounded-xl bg-red-50 text-red-500 font-bold text-xs';
            el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>ERROR</span>`;
            break;
    }
}

// --- 核心邏輯：新增與渲染 ---

async function loadDateLogs(date) {
    if (isLoading) return;
    isLoading = true;
    container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-300"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';

    try {
        const res = await apiGetLog(date);
        container.innerHTML = "";
        if (res.status === "success" && res.items.length > 0) {
            for (const it of res.items) {
                await addNewItem(it.title, it.content, it.isDone, it.tags, it.item_id);
            }
        } else {
            addNewItem();
        }
    } catch (e) { updateStatus('error'); }
    finally { isLoading = false; isModified = false; }
}

async function saveToBackend() {
    const datePicker = document.getElementById('date-picker');
    const date = datePicker ? datePicker.value : "";
    const cards = Array.from(document.querySelectorAll('#todo-container > .task-card'));

    const items = cards.map(card => {
        const tagSpans = Array.from(card.querySelectorAll('.tag-text'));
        return {
            item_id: card.getAttribute('data-id'),
            title: card.querySelector('.project-title').value.trim(),
            tags: tagSpans.map(s => s.innerText).join(' '),
            content: card.querySelector('textarea').value.trim(),
            isDone: card.classList.contains('completed')
        };
    }).filter(it => it.title !== "");

    updateStatus('saving');
    try {
        const success = await apiSaveLog(date, items);
        if (success) { isModified = false; updateStatus('saved'); }
        else { updateStatus('error'); }
    } catch (e) { updateStatus('error'); }
}

async function addNewItem(title = "", content = "", isDone = false, tags = "", itemId = null) {
    const uid = itemId || generateUUID();
    const itemDiv = document.createElement('div');
    itemDiv.setAttribute('data-id', uid);
    itemDiv.className = `group task-card relative ${isDone ? 'completed' : ''}`;

    itemDiv.innerHTML = `
        <div class="flex items-start gap-4 h-full">
            <div class="drag-handle mt-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"><i class="fa-solid fa-grip-lines"></i></div>

            <div class="flex-grow min-w-0 flex flex-col justify-center">
                <input type="text" value="${title}" placeholder="What to focus on?" class="project-title w-full font-black text-gray-800 border-none focus:ring-0 p-0 bg-transparent text-xl tracking-tight placeholder-gray-300">

                <div class="tag-container mt-2">
                    <i class="fa-solid fa-hashtag text-[10px] text-gray-300 mr-1"></i>
                    <input type="text" placeholder="Tags..." class="ghost-tag-input" onkeydown="handleTagInput(event, this)" onblur="handleTagBlur(this)">
                </div>

                <div class="project-dashboard mt-4 hidden">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">History</span>
                        <span class="days-count text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold"></span>
                    </div>
                    <div class="history-timeline-container max-h-32 overflow-y-auto custom-scrollbar border-l-2 border-gray-100 pl-4 space-y-3 mb-2"></div>
                </div>

                <textarea placeholder="Notes..." class="w-full text-sm text-gray-500 border-none focus:ring-0 p-0 mt-3 resize-none bg-transparent leading-relaxed placeholder-gray-300" rows="1" oninput="autoResize(this)">${content}</textarea>
            </div>

            <div class="flex flex-col gap-4 action-btn-group">
                <button onclick="toggleDone(this)" class="text-gray-200 hover:text-green-500 transition-all active:scale-75"><i class="fa-solid fa-circle-check text-2xl"></i></button>
                <button onclick="deleteItem(this)" class="text-gray-200 hover:text-red-400 transition-all active:scale-75"><i class="fa-solid fa-trash-can text-sm"></i></button>
            </div>
        </div>`;

    container.appendChild(itemDiv);

    const tagBox = itemDiv.querySelector('.tag-container');
    if (tags) tags.split(' ').forEach(t => createTagCapsule(t, tagBox));

    autoResize(itemDiv.querySelector('textarea'));
    if (title.trim()) await renderHistory(itemDiv, title, tags);
}

function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

// ✅ 重構：點擊勾勾時的自動排序邏輯
function toggleDone(btn) {
    const card = btn.closest('.task-card');
    const isNowCompleted = !card.classList.contains('completed');

    card.classList.toggle('completed');

    // 逆向邏輯與沉底邏輯：
    if (isNowCompleted) {
        // 完成：移動到最下方
        container.appendChild(card);
    } else {
        // 取消勾選：移動到最上方 (主要對象)
        container.prepend(card);
    }

    isModified = true;
    triggerAutoSave();
}

function deleteItem(btn) {
    if(confirm("Delete item?")) {
        btn.closest('.task-card').remove();
        isModified = true;
        triggerAutoSave();
    }
}

// --- 專案歷史儀表板 ---
async function renderHistory(cardEl, title, tags) {
    const dashboard = cardEl.querySelector('.project-dashboard');
    const timeline = cardEl.querySelector('.history-timeline-container');
    const daysLabel = cardEl.querySelector('.days-count');
    const datePicker = document.getElementById('date-picker');
    const today = datePicker ? datePicker.value : "";
    try {
        const data = await apiGetProjectHistory(title, tags);
        if (data.status === "success" && data.history.length > 1) {
            const past = data.history.filter(h => h.date !== today);
            if (past.length > 0) {
                dashboard.classList.remove('hidden');
                daysLabel.innerText = `${data.total_days} DAYS`;
                timeline.innerHTML = past.map(h => `
                    <div class="history-item relative">
                        <div class="text-[9px] font-bold text-blue-300 mb-0.5">${h.date}</div>
                        <div class="text-[11px] text-gray-400 leading-snug">${h.content.replace(/\n/g, '<br>')}</div>
                        <div class="timeline-line"></div>
                    </div>`).join('');
            }
        }
    } catch (e) {}
}

// --- 足跡回顧抽屜 ---
async function openDrawer() {
    document.getElementById('history-drawer').classList.remove('translate-x-full');
    document.getElementById('drawer-overlay').classList.replace('opacity-0', 'opacity-30');
    document.getElementById('drawer-overlay').classList.remove('pointer-events-none');
    await refreshHistoryFeed();
}

function closeDrawer() {
    document.getElementById('history-drawer').classList.add('translate-x-full');
    document.getElementById('drawer-overlay').classList.replace('opacity-30', 'opacity-0');
    document.getElementById('drawer-overlay').classList.add('pointer-events-none');
}

async function refreshHistoryFeed() {
    const feed = document.getElementById('history-feed');
    feed.innerHTML = '<div class="text-center py-20"><i class="fa-solid fa-spinner fa-spin text-gray-200"></i></div>';
    try {
        const data = await apiGetAllLogs();
        if (data.status === "success") {
            feed.innerHTML = "";
            data.logs.forEach(day => {
                const section = document.createElement('div');
                section.className = "mb-8";
                section.innerHTML = `<h3 class="text-[10px] font-black text-gray-300 mb-4 uppercase tracking-widest">${day.date}</h3>`;

                day.items.forEach(it => {
                    const task = document.createElement('div');
                    task.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-50 mb-3 group/hist relative hover:border-blue-100 transition-all";

                    const chips = it.tags ? it.tags.split(' ').map(t =>
                        `<span class="bg-blue-50 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-md mr-1">#${t}</span>`
                    ).join('') : '';

                    task.innerHTML = `
                        <div class="flex items-start gap-3">
                            <div class="mt-1">${it.isDone ? '<i class="fa-solid fa-circle-check text-green-400"></i>' : '<i class="fa-solid fa-circle-dot text-amber-300"></i>'}</div>
                            <div>
                                <div class="text-sm font-bold text-gray-700">${it.title}</div>
                                <div class="mt-1.5 flex flex-wrap">${chips}</div>
                                ${it.content ? `<div class="mt-3 text-xs text-gray-400 leading-relaxed italic">${it.content.replace(/\n/g, '<br>')}</div>` : ''}
                            </div>
                        </div>
                        <div class="opacity-0 group-hover/hist:opacity-100 absolute -right-2 -top-2 transition-all scale-90 hover:scale-100">
                             <button onclick="continueTask('${it.title.replace(/'/g, "\\'")}', '${it.tags}')" class="bg-blue-600 text-white text-[10px] px-3 py-2 rounded-xl shadow-lg font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1">
                                <i class="fa-solid fa-arrow-turn-up"></i> Continue
                             </button>
                        </div>`;
                    section.appendChild(task);
                });
                feed.appendChild(section);
            });
        }
    } catch (e) { feed.innerHTML = "Error loading history"; }
}

function continueTask(t, tags) {
    addNewItem(t, "", false, tags);
    closeDrawer();
    triggerAutoSave();
}

function filterHistory(k) {
    document.querySelectorAll('.history-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(k.toLowerCase()) ? 'block' : 'none';
    });
}