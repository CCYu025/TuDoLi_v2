// static/js/app.js

let container;
let isModified = false;
let isLoading = false;
let saveTimer = null; // 用於防抖儲存的計時器
const SAVE_DELAY = 1000; // 自動儲存延遲 (毫秒)

// 輔助函數：生成 UUID (用於前端新建項目)
const generateUUID = () => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

window.onload = async () => {
    container = document.getElementById('todo-container');
    if (container) {
        // 初始化拖曳功能，並在拖曳結束時觸發自動儲存
        new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'ghost',
            onEnd: () => triggerAutoSave() // 拖曳後自動存
        });

        // 全局監聽輸入事件，實現防抖儲存
        container.addEventListener('input', () => {
            isModified = true;
            triggerAutoSave();
        });
    }

    // 初始化日期
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = (new Date(now - offset)).toISOString().split('T')[0];
    document.getElementById('date-picker').value = localDate;

    // 替換儲存按鈕為狀態指示燈
    transformSaveButtonToStatus();

    // 平行載入日誌與原子習慣
    await Promise.all([
        loadDateLogs(localDate),
        initHabits(localDate)
    ]);
};

// --- 自動儲存系統 (Auto-Save System) ---

function triggerAutoSave() {
    updateStatus('editing'); // 轉為黃燈 (編輯中)

    if (saveTimer) clearTimeout(saveTimer);

    saveTimer = setTimeout(async () => {
        await saveToBackend();
    }, SAVE_DELAY);
}

// 將原本的 Save Button 改造為狀態燈
function transformSaveButtonToStatus() {
    const saveBtn = document.querySelector('button[onclick="saveToBackend()"]');
    if (saveBtn) {
        // 移除點擊事件，改為純展示
        saveBtn.removeAttribute('onclick');
        saveBtn.id = 'status-indicator';
        saveBtn.className = 'px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-bold text-sm bg-gray-100 text-gray-400 cursor-default';
        saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span class="hidden sm:inline">Ready</span>`;
    }
}

function updateStatus(state) {
    const indicator = document.getElementById('status-indicator');
    if (!indicator) return;

    switch(state) {
        case 'editing':
            indicator.className = 'px-4 py-2 rounded-xl transition-all font-bold text-sm bg-yellow-50 text-yellow-500';
            indicator.innerHTML = `<i class="fa-solid fa-pen-nib fa-bounce"></i>`;
            break;
        case 'saving':
            indicator.className = 'px-4 py-2 rounded-xl transition-all font-bold text-sm bg-blue-50 text-blue-500';
            indicator.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
            break;
        case 'saved':
            indicator.className = 'px-4 py-2 rounded-xl transition-all font-bold text-sm bg-green-50 text-green-500';
            indicator.innerHTML = `<i class="fa-solid fa-check"></i>`;
            // 3秒後恢復平靜狀態
            setTimeout(() => {
                if(!isModified) { // 如果沒有新的修改，才變回灰色
                    indicator.className = 'px-4 py-2 rounded-xl transition-all font-bold text-sm bg-gray-50 text-gray-300';
                    indicator.innerHTML = `<i class="fa-solid fa-check"></i>`;
                }
            }, 3000);
            break;
        case 'error':
            indicator.className = 'px-4 py-2 rounded-xl transition-all font-bold text-sm bg-red-50 text-red-500';
            indicator.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i>`;
            break;
    }
}

// --- 日期切換邏輯 ---

async function handleDateChange(newDate) {
    if (isLoading) return;
    // 因為有自動儲存，切換日期前強制存一次確保萬無一失
    if (isModified) {
        await saveToBackend();
    }

    await Promise.all([
        loadDateLogs(newDate),
        initHabits(newDate)
    ]);
}

// --- 日誌載入邏輯 ---

async function loadDateLogs(date) {
    if (isLoading || !container) return;
    isLoading = true;
    container.innerHTML = '<div class="text-center text-gray-300 py-20"><i class="fa-solid fa-circle-notch fa-spin text-xl"></i></div>';

    try {
        const data = await apiGetLog(date);

        container.innerHTML = "";
        if (data.status === "success" && data.items.length > 0) {
            for (const it of data.items) {
                // ✅ 傳入 item_id
                await addNewItem(it.title, it.content, it.isDone, it.tags, it.item_id);
            }
        } else {
            addNewItem();
        }
        isModified = false;
        updateStatus('saved');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-center py-20 text-red-300 text-xs font-bold">BACKEND OFFLINE</div>';
        updateStatus('error');
    } finally {
        isLoading = false;
    }
}

// --- 儲存邏輯 (核心修改) ---

async function saveToBackend() {
    if (isLoading) return; // 避免衝突

    updateStatus('saving');
    const date = document.getElementById('date-picker').value;

    // ✅ 收集 item_id
    const items = Array.from(document.querySelectorAll('#todo-container > div')).map(card => ({
        item_id: card.getAttribute('data-id'), // 讀取 UUID
        title: card.querySelector('.project-title').value.trim(),
        tags: card.querySelector('.tag-input').value.trim(),
        content: card.querySelector('textarea').value.trim(),
        isDone: card.classList.contains('completed')
    })).filter(it => it.title !== "");

    try {
        const success = await apiSaveLog(date, items);
        if(success) {
            isModified = false;
            updateStatus('saved');
            // 注意：這裡不再重新 reload loadDateLogs，因為那樣會打斷使用者的輸入焦點
            // 這是「無感儲存」的關鍵
        } else {
            updateStatus('error');
        }
    } catch (e) {
        console.error(e);
        updateStatus('error');
    }
}

// --- UI 組件渲染 (新增卡片) ---

async function addNewItem(title = "", content = "", isDone = false, tags = "", itemId = null) {
    // ✅ 確保有 UUID，如果沒有則生成新的
    const uid = itemId || generateUUID();

    const itemDiv = document.createElement('div');
    // ✅ 將 UUID 寫入 DOM 屬性 data-id
    itemDiv.setAttribute('data-id', uid);
    itemDiv.className = `group bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all ${isDone ? 'completed' : ''}`;

    itemDiv.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="drag-handle mt-2 text-gray-200 hover:text-gray-400 cursor-grab transition-colors"><i class="fa-solid fa-bars"></i></div>
            <div class="flex-grow min-w-0">
                <input type="text" value="${title}" placeholder="Project or Task Title..." class="project-title w-full font-black text-gray-800 border-none focus:ring-0 p-0 bg-transparent text-xl tracking-tight">
                <div class="flex items-center gap-2 mt-2">
                    <i class="fa-solid fa-tags text-[10px] text-gray-300"></i>
                    <input type="text" value="${tags}" placeholder="Tags..." class="tag-input text-[11px] font-bold text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-lg outline-none w-full border-none focus:bg-blue-100 transition-all">
                </div>
                <div class="project-dashboard mt-4 hidden">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Project History</span>
                        <span class="days-count text-[9px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold"></span>
                    </div>
                    <div class="history-timeline-container max-h-40 overflow-y-auto custom-scrollbar border-l-2 border-gray-100 pl-4 space-y-3 mb-4 py-1"></div>
                </div>
                <textarea placeholder="Write today's progress here..." class="w-full text-sm text-gray-600 border-none focus:ring-0 p-0 mt-3 resize-none bg-transparent leading-relaxed" rows="1" oninput="autoResize(this)" style="overflow:hidden; display:block;">${content}</textarea>
            </div>
            <div class="flex flex-col gap-4">
                <button onclick="toggleDone(this)" class="text-gray-200 hover:text-green-500 transition-all active:scale-90"><i class="fa-solid fa-check-circle text-2xl"></i></button>
                <button onclick="deleteItem(this)" class="text-gray-200 hover:text-red-400 transition-all"><i class="fa-solid fa-trash text-sm"></i></button>
            </div>
        </div>`;

    container.appendChild(itemDiv);
    autoResize(itemDiv.querySelector('textarea'));

    const isProjectRelated = title.includes("專案_") || tags.trim() !== "";
    if (title.trim() && isProjectRelated) {
        await renderHistory(itemDiv, title, tags);
    }
}

// --- 輔助操作函數 ---

function toggleDone(btn) {
    btn.closest('.group').classList.toggle('completed');
    triggerAutoSave(); // ✅ 狀態改變也自動存
}

function deleteItem(btn) {
    if(confirm("確定刪除此項目？")) {
        btn.closest('.group').remove();
        triggerAutoSave(); // ✅ 刪除後自動存
    }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// --- 專案歷史儀表板 (保持不變) ---
async function renderHistory(cardEl, title, tags) {
    const dashboard = cardEl.querySelector('.project-dashboard');
    const timeline = cardEl.querySelector('.history-timeline-container');
    const daysLabel = cardEl.querySelector('.days-count');
    const todayDate = document.getElementById('date-picker').value;

    try {
        const data = await apiGetProjectHistory(title, tags);
        if (data.status === "success" && data.history.length > 0) {
            const pastHistory = data.history.filter(h => h.date !== todayDate);
            if (pastHistory.length > 0) {
                dashboard.classList.remove('hidden');
                daysLabel.innerText = `${data.total_days} Days Project`;
                timeline.innerHTML = pastHistory.map(h => `
                    <div class="history-item relative">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-black text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">${h.date}</span>
                        </div>
                        <div class="text-[11px] text-gray-400 leading-relaxed border-b border-gray-50 pb-2">
                            ${h.content.replace(/\n/g, '<br>')}
                        </div>
                    </div>`).join('');
            }
        }
    } catch (e) { console.error(e); }
}

// --- 足跡回顧 (保持不變) ---
// (此處省略 openDrawer, refreshHistoryFeed 等未變動函數，請保留原檔案中的實作)
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
    // ... (保留原有的 apiGetAllLogs 邏輯) ...
    // 注意：這裡只做讀取，不涉及 save 邏輯，故不需要大幅修改
    // 為節省篇幅，請保留原檔案內容，或需要我完整貼出請告知
    const feed = document.getElementById('history-feed');
    feed.innerHTML = '<div class="text-center text-gray-300 mt-20"><i class="fa-solid fa-spinner fa-spin text-xl"></i></div>';
    try {
        const data = await apiGetAllLogs();
        if (data.status === "success") {
            feed.innerHTML = "";
            data.logs.forEach(day => {
                const section = document.createElement('div');
                section.className = "history-card";
                section.innerHTML = `<h3 class="text-[10px] font-black text-gray-200 mb-3 tracking-widest uppercase"><i class="fa-calendar-alt mr-1"></i>${day.date}</h3>`;

                day.items.forEach(it => {
                    const task = document.createElement('div');
                    // ... 渲染邏輯 ...
                    task.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-50 mb-3 group/hist relative hover:border-blue-100 transition-all";
                    const tagChips = it.tags ? it.tags.split(' ').map(tag => `<span class="bg-blue-50 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-md mr-1">#${tag}</span>`).join('') : '';

                    task.innerHTML = `
                        <div class="flex items-start gap-3">
                            <div class="mt-1">${it.isDone ? '<i class="fa-check-circle text-green-400"></i>' : '<i class="fa-dot-circle text-amber-300"></i>'}</div>
                            <div>
                                <div class="text-xs font-bold text-gray-600">${it.title}</div>
                                <div class="mt-1.5 flex flex-wrap">${tagChips}</div>
                                ${it.content ? `<div class="mt-3 text-[11px] text-gray-400 italic leading-relaxed">${it.content.replace(/\n/g, '<br>')}</div>` : ''}
                            </div>
                        </div>
                        <div class="opacity-0 group-hover/hist:opacity-100 absolute -right-2 -top-2 flex gap-1 transition-all">
                             <button onclick="continueTask('${it.title.replace(/'/g, "\\'")}', '${it.tags}')" class="bg-blue-600 text-white text-[9px] px-2.5 py-1.5 rounded-lg shadow-xl font-bold uppercase tracking-tighter">Continue Project</button>
                        </div>`;
                    section.appendChild(task);
                });
                feed.appendChild(section);
            });
        }
    } catch (e) {
        feed.innerHTML = '載入失敗';
    }
}

function filterHistory(k) {
    document.querySelectorAll('.history-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(k.toLowerCase()) ? 'block' : 'none';
    });
}

function continueTask(t, tags) {
    addNewItem(t, "", false, tags);
    closeDrawer();
    triggerAutoSave(); // ✅ 新增後自動存
}