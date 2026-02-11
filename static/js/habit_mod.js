// static/js/habit_mod.js

let currentHabits = [];
let tempEmptyGroups = [];

async function initHabits(date) {
    const container = document.getElementById('habit-bar-container');
    if (!container) return;
    container.innerHTML = '<div class="animate-pulse flex space-x-2"><div class="h-8 w-8 bg-gray-200 rounded-full"></div></div>';
    try {
        const data = await apiGetHabits(date);
        if (data.status === "success") {
            currentHabits = data.habits;
            renderHabitBar(data.habits);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '';
    }
}

// --- 1. 主畫面渲染 (Fusion Capsule) ---

function renderHabitBar(habits) {
    const container = document.getElementById('habit-bar-container');
    const date = document.getElementById('date-picker').value;

    if (habits.length === 0) {
        container.innerHTML = `<button onclick="openHabitSettings()" class="text-xs text-gray-400 border border-dashed border-gray-300 rounded-full px-3 py-1 hover:border-blue-400 hover:text-blue-500 transition-colors">+</button>`;
        return;
    }

    const renderQueue = [];
    const groupMap = {};
    habits.forEach(h => {
        if (h.group_id && h.group_id !== 0) {
            if (!groupMap[h.group_id]) {
                const group = { type: 'group', id: h.group_id, items: [] };
                groupMap[h.group_id] = group;
                renderQueue.push(group);
            }
            groupMap[h.group_id].items.push(h);
        } else {
            renderQueue.push({ type: 'single', data: h });
        }
    });

    let html = `
        <div class="flex items-center gap-2 flex-wrap">
            <button onclick="handleMarkAllDone('${date}')" class="lightning-btn text-gray-300 hover:text-amber-400 transition-all p-2 mr-1 flex-shrink-0" title="Strike All Done">
                <i class="fa-solid fa-bolt text-lg"></i>
            </button>
    `;

    renderQueue.forEach(obj => {
        if (obj.type === 'single') {
            html += renderCapsule(obj.data, date, false);
        } else {
            html += `<div class="habit-group-container">`;
            obj.items.forEach(h => { html += renderCapsule(h, date, true); });
            html += `</div>`;
        }
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderCapsule(h, date, isGrouped) {
    let statusClass = 'habit-todo';
    let capsuleStyle = '';
    let iconStyle = '';
    const firstChar = Array.from(h.title)[0];
    let icon = firstChar;

    if (h.status === 1) {
        statusClass = 'habit-done';
        if (isGrouped) {
            capsuleStyle = `--habit-color: ${h.color};`;
        } else {
            capsuleStyle = `border-color: ${h.color};`;
            iconStyle = `background-color: ${h.color};`;
        }
    } else if (h.status === 0) {
        statusClass = 'habit-failed';
    }

    return `
        <div onclick="handleHabitClick(${h.id}, ${h.status}, '${date}')"
             class="habit-capsule ${statusClass}"
             style="${capsuleStyle}"
             title="${h.title}">
            <span class="habit-icon" style="${iconStyle}">${icon}</span>
            <span class="habit-label">${h.title}</span>
        </div>
    `;
}

// --- 2. 互動 ---

async function handleHabitClick(id, currentStatus, date) {
    let nextStatus = 1;
    if (currentStatus === 1) nextStatus = 0;
    else if (currentStatus === 0) nextStatus = 1;
    await apiToggleHabit(date, id, nextStatus);
    await initHabits(date);
}

async function handleMarkAllDone(date) {
    const btn = document.querySelector('.lightning-btn');
    if(btn) btn.classList.add('active');
    await apiMarkAllHabitsDone(date);
    setTimeout(() => { initHabits(date); }, 300);
}

// --- 3. 選單與彈窗 ---

function openAppMenu() {
    const drawer = document.getElementById('app-menu-drawer');
    const overlay = document.getElementById('app-menu-overlay');
    drawer.classList.remove('-translate-x-full');
    overlay.classList.replace('opacity-0', 'opacity-30');
    overlay.classList.remove('pointer-events-none');
}

function closeAppMenu() {
    const drawer = document.getElementById('app-menu-drawer');
    const overlay = document.getElementById('app-menu-overlay');
    drawer.classList.add('-translate-x-full');
    overlay.classList.replace('opacity-30', 'opacity-0');
    overlay.classList.add('pointer-events-none');
}

function openHabitSettings() {
    closeAppMenu();
    document.getElementById('habit-settings-modal').classList.remove('hidden');
    renderHabitSettingsList();
}

async function closeHabitSettings() {
    document.getElementById('habit-settings-modal').classList.add('hidden');
    // 自動解散邏輯
    await autoDissolveChains();
}

async function autoDissolveChains() {
    const groups = {};
    currentHabits.forEach(h => {
        if (h.group_id && h.group_id !== 0) {
            if (!groups[h.group_id]) groups[h.group_id] = [];
            groups[h.group_id].push(h);
        }
    });

    const dissolveUpdates = [];
    Object.keys(groups).forEach(gid => {
        if (groups[gid].length < 2) {
            groups[gid].forEach(h => {
                dissolveUpdates.push(apiUpdateHabit(h.id, { group_id: 0 }));
            });
        }
    });

    if (dissolveUpdates.length > 0) {
        await Promise.all(dissolveUpdates);
        const date = document.getElementById('date-picker').value;
        const data = await apiGetHabits(date);
        currentHabits = data.habits;
        renderHabitBar(currentHabits);
    }
    tempEmptyGroups = [];
}


// --- 4. 設定列表渲染 (托盤化 + 空框優化) ---

function renderHabitSettingsList() {
    const chainContainer = document.getElementById('chain-container');
    const singleList = document.getElementById('habit-settings-list');

    chainContainer.innerHTML = '';
    singleList.innerHTML = '';

    const groups = {};
    const singles = [];

    currentHabits.forEach(h => {
        if (h.group_id && h.group_id !== 0) {
            if (!groups[h.group_id]) groups[h.group_id] = [];
            groups[h.group_id].push(h);
        } else {
            singles.push(h);
        }
    });

    tempEmptyGroups = tempEmptyGroups.filter(gid => !groups[gid]);
    const allGroupIds = [...new Set([...Object.keys(groups), ...tempEmptyGroups])];

    allGroupIds.forEach(gid => {
        const groupEl = document.createElement('div');
        groupEl.className = 'habit-setting-group';

        // [修改] 如果這個群組是空的，加上 empty-chain class
        if (!groups[gid] || groups[gid].length === 0) {
            groupEl.classList.add('empty-chain');
        }

        groupEl.dataset.groupId = gid;
        groupEl.innerHTML = `
            <button onclick="handleDeleteGroup('${gid}')" class="group-delete-btn" title="Remove Chain">
                <i class="fa-solid fa-times"></i>
            </button>
        `;

        if (groups[gid]) {
            groups[gid].forEach(h => {
                groupEl.appendChild(createHabitItemEl(h));
            });
        }
        chainContainer.appendChild(groupEl);
    });

    singles.forEach(h => {
        singleList.appendChild(createHabitItemEl(h));
    });

    initDragAndDrop();
}

function createHabitItemEl(h) {
    const el = document.createElement('div');
    el.className = 'habit-setting-item';
    el.dataset.id = h.id;
    el.innerHTML = `
        <div class="flex items-center gap-3 flex-grow cursor-pointer overflow-hidden" onclick="handleEditHabit(${h.id}, '${h.title}', '${h.color}')">
            <div class="item-icon-wrapper w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white font-bold" style="background-color: ${h.color}">
                ${Array.from(h.title)[0]}
            </div>
            <span class="item-title text-sm font-bold text-gray-700 truncate">${h.title}</span>
        </div>
        <div class="item-actions">
            <button onclick="handleDeleteHabit(${h.id})" class="text-gray-300 hover:text-red-400 p-1 ml-2 flex-shrink-0">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `;
    return el;
}

function initDragAndDrop() {
    const singleList = document.getElementById('habit-settings-list');
    const groupZones = document.querySelectorAll('.habit-setting-group');

    new Sortable(singleList, {
        group: 'habits', animation: 150, sort: false,
        onAdd: async (evt) => {
            await apiUpdateHabit(evt.item.dataset.id, { group_id: 0 });
            refreshData();
        }
    });

    groupZones.forEach(zone => {
        new Sortable(zone, {
            group: 'habits', animation: 150,
            onAdd: async (evt) => {
                const newGroupId = evt.to.dataset.groupId;
                await apiUpdateHabit(evt.item.dataset.id, { group_id: parseInt(newGroupId) });
                refreshData();
            }
        });
    });
}

// --- 5. 操作事件 ---

async function handleAddGroup() {
    if (tempEmptyGroups.length > 0) {
        document.getElementById('chain-container').scrollTop = 0;
        return;
    }
    tempEmptyGroups.unshift(Date.now());
    renderHabitSettingsList();
    setTimeout(() => { document.getElementById('chain-container').scrollTop = 0; }, 50);
}

async function handleDeleteGroup(gid) {
    const habitsInGroup = currentHabits.filter(h => h.group_id == gid);
    await Promise.all(habitsInGroup.map(h => apiUpdateHabit(h.id, { group_id: 0 })));
    tempEmptyGroups = tempEmptyGroups.filter(id => id != gid);
    refreshData();
}

async function handleAddHabit() {
    const titleInput = document.getElementById('new-habit-title');
    const colorInput = document.getElementById('new-habit-color');
    const title = titleInput.value.trim();
    if (!title) return;

    await apiAddHabit({ title: title, color: colorInput.value, group_id: 0 });
    titleInput.value = "";
    refreshData();
}

async function handleEditHabit(id, oldTitle, oldColor) {
    const newTitle = prompt("", oldTitle);
    if (newTitle && newTitle.trim()) {
        await apiUpdateHabit(id, { title: newTitle });
        refreshData();
    }
}

async function handleDeleteHabit(id) {
    if (confirm("Delete?")) {
        await apiDeleteHabit(id);
        refreshData();
    }
}

async function refreshData() {
    const date = document.getElementById('date-picker').value;
    const data = await apiGetHabits(date);
    currentHabits = data.habits;
    renderHabitSettingsList();
    renderHabitBar(currentHabits);
}