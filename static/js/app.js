// static/js/app.js

let container;
let isModified = false;
let isLoading = false;

window.onload = async () => {
    container = document.getElementById('todo-container');
    if (container) {
        new Sortable(container, { animation: 150, handle: '.drag-handle', ghostClass: 'ghost' });
        container.addEventListener('input', () => isModified = true);
    }

    // 初始化日期
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = (new Date(now - offset)).toISOString().split('T')[0];
    document.getElementById('date-picker').value = localDate;

    // 平行載入日誌與原子習慣 (這是 Phase 2 新增的關鍵邏輯)
    await Promise.all([
        loadDateLogs(localDate),
        initHabits(localDate)
    ]);
};

// --- 日期切換邏輯 ---

async function handleDateChange(newDate) {
    if (isLoading) return;
    if (isModified && !confirm("尚未儲存，確定要切換日期嗎？")) return;
    isModified = false;

    // 同步更新日誌與習慣
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
        const data = await apiGetLog(date); // 使用 api.js

        // Console Log 用於除錯，確認後端有回傳資料
        console.log("📅 Date:", date, "📦 Data:", data);

        container.innerHTML = "";
        if (data.status === "success" && data.items.length > 0) {
            for (const it of data.items) {
                await addNewItem(it.title, it.content, it.isDone, it.tags);
            }
        } else {
            addNewItem(); // 無資料時新增一筆空白
        }
        isModified = false;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-center py-20 text-red-300 text-xs font-bold">BACKEND OFFLINE</div>';
    } finally {
        isLoading = false;
    }
}

// --- 儲存邏輯 ---

async function saveToBackend() {
    const date = document.getElementById('date-picker').value;
    const items = Array.from(document.querySelectorAll('#todo-container > div')).map(card => ({
        title: card.querySelector('.project-title').value.trim(),
        tags: card.querySelector('.tag-input').value.trim(),
        content: card.querySelector('textarea').value.trim(),
        isDone: card.classList.contains('completed')
    })).filter(it => it.title !== "");

    try {
        const success = await apiSaveLog(date, items); // 使用 api.js
        if(success) {
            isModified = false;
            alert("✅ 進度已儲存。");
            await loadDateLogs(date);
        }
    } catch (e) { alert('儲存失敗'); }
}

// --- UI 組件渲染 (新增卡片) ---

async function addNewItem(title = "", content = "", isDone = false, tags = "") {
    const itemDiv = document.createElement('div');
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
                <button onclick="this.closest('.group').remove()" class="text-gray-200 hover:text-red-400 transition-all"><i class="fa-solid fa-trash text-sm"></i></button>
            </div>
        </div>`;

    container.appendChild(itemDiv);
    autoResize(itemDiv.querySelector('textarea'));

    const isProjectRelated = title.includes("專案_") || tags.trim() !== "";
    if (title.trim() && isProjectRelated) {
        await renderHistory(itemDiv, title, tags);
    }
}

// --- 專案歷史儀表板 ---

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

// --- 輔助函數 ---
function autoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function toggleDone(btn) {
    btn.closest('.group').classList.toggle('completed');
    isModified = true;
}

// --- 足跡回顧抽屜 (History Drawer) ---

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
        console.error(e);
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
    isModified = true;
}