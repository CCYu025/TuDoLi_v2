/**
 * Project Map Module (V3.1 - Star Rank & Hard Delete)
 * 功能全集：
 * 1. 幽靈容器 (Ghost Container)：Drag-to-Create。
 * 2. 星級視覺系統 (Star Rank)：以星星數量取代文字標題 (Index based)。
 * 3. 物理刪除 (Hard Delete)：X 按鈕會真正刪除容器，並將子任務合併回 Genesis。
 * 4. 空容器保留：移除自動清理邏輯，允許空里程碑存在。
 */

let currentMapOriginId = null;

// --- 1. 開啟與關閉地圖 ---

async function openProjectMap(originId) {
    if (!originId || originId === 'null') {
        alert("此任務尚未連結到任何專案家族。");
        return;
    }

    currentMapOriginId = originId;
    const modal = document.getElementById('project-map-modal');
    const canvas = document.getElementById('project-map-canvas');

    // 顯示 Modal
    modal.classList.remove('hidden');
    canvas.innerHTML = '<div class="text-center py-20 text-gray-400"><i class="fa-solid fa-dna fa-spin text-3xl"></i><p class="mt-4 text-xs font-bold tracking-widest">DECODING DNA...</p></div>';

    try {
        const response = await fetch(`/project/tree/${originId}`);
        const data = await response.json();

        if (data.status === 'success') {
            renderProjectMap(data.tree);
        } else {
            canvas.innerHTML = '<div class="text-center py-20 text-red-300">Failed to load project DNA.</div>';
        }
    } catch (e) {
        console.error(e);
        canvas.innerHTML = '<div class="text-center py-20 text-red-300">Connection Error.</div>';
    }
}

// ✅ 修改：移除所有自動清理邏輯，只負責關閉介面
function closeProjectMap() {
    document.getElementById('project-map-modal').classList.add('hidden');
    currentMapOriginId = null;
}

// --- 2. 核心渲染邏輯 ---

function renderProjectMap(treeData) {
    const canvas = document.getElementById('project-map-canvas');

    // 更新頂部資訊 (只抓 Root 的標題)
    if (treeData.length > 0) {
        const rootItem = treeData.find(i => i.item_id === currentMapOriginId) || treeData[0];
        document.getElementById('map-project-title').innerText = rootItem.title;
        document.getElementById('map-origin-date').innerText = `Origin: ${rootItem.date}`;

        const uniqueDays = new Set(treeData.map(i => i.date)).size;
        document.getElementById('map-total-days').innerText = `${uniqueDays} DAYS EVOLVED`;
    }

    canvas.innerHTML = '';

    // A. 建立索引
    let milestoneMap = new Map();
    let orphans = [];

    treeData.forEach(item => {
        if (item.relation_type === 'evolve' || item.relation_type === 'root' || item.item_id === currentMapOriginId) {
            milestoneMap.set(item.item_id, { ...item, children: [] });
        }
    });

    treeData.forEach(item => {
        if (item.item_id === currentMapOriginId) return;
        const parentId = item.parent_id;

        if (parentId && milestoneMap.has(parentId)) {
            milestoneMap.get(parentId).children.push(item);
        } else if (item.relation_type !== 'evolve' && item.relation_type !== 'root') {
            orphans.push(item);
        }
    });

    if (orphans.length > 0 && milestoneMap.has(currentMapOriginId)) {
        milestoneMap.get(currentMapOriginId).children.push(...orphans);
    }

    // B. 排序與生成 DOM
    let sortedMilestones = Array.from(milestoneMap.values()).sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    sortedMilestones.forEach((ms, index) => {
        const tray = document.createElement('div');
        tray.className = 'milestone-tray group transition-all duration-300 relative hover:border-blue-200';
        tray.setAttribute('data-parent-id', ms.item_id);
        tray.setAttribute('id', `tray-${ms.item_id}`);
        tray.setAttribute('data-base-date', ms.date);

        const isRoot = (ms.item_id === currentMapOriginId);
        const nodeClass = isRoot ? 'node-root' : 'node-evolve';
        const badgeClass = isRoot ? 'badge-root' : 'badge-evolve';
        const icon = isRoot ? 'fa-seedling' : 'fa-shuttle-space';

        // ✅ 視覺優化：星級制 (Star Rank System)
        // 根節點顯示 GENESIS，其他根據 index 顯示對應數量的星星
        let labelHtml = '';
        if (isRoot) {
            labelHtml = '<span>GENESIS</span>';
        } else {
            // 產生 index 數量的星星
            // index 1 -> 1 star, index 2 -> 2 stars...
            labelHtml = Array(index).fill('<i class="fa-solid fa-star text-xs ml-0.5"></i>').join('');
        }

        ms.children.sort((a, b) => a.date.localeCompare(b.date));
        let childrenHtml = ms.children.map(child => createMapTaskHtml(child)).join('');

        let displayDate = ms.date;
        if (ms.children.length > 0) {
            const firstChildDate = ms.children[0].date;
            if (firstChildDate < displayDate) displayDate = firstChildDate;
        }

        let deleteBtnHtml = '';
        if (!isRoot) {
            // X 按鈕保留，但邏輯已改為物理刪除
            deleteBtnHtml = `
                <button onclick="deleteMilestone('${ms.item_id}')"
                        class="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border border-red-200 text-red-400 shadow-sm
                               flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all
                               hover:bg-red-50 hover:text-red-500 hover:scale-110 cursor-pointer z-10"
                        title="Remove Phase & Merge Tasks">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        }

        tray.innerHTML = `
            ${deleteBtnHtml}
            <div class="milestone-node ${nodeClass}"></div>
            <div class="mb-4 pl-2">
                <div class="evo-badge ${badgeClass}">
                    <i class="fa-solid ${icon}"></i>
                    <div class="flex gap-1 items-center ml-1">${labelHtml}</div>
                </div>
                <div class="flex justify-between items-start mt-2">
                    <div class="h-1"></div>
                    <span class="milestone-date text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded ml-2 whitespace-nowrap">${displayDate}</span>
                </div>
            </div>
            <div class="map-task-list space-y-2 min-h-[40px] pb-2" data-parent-id="${ms.item_id}">
                ${childrenHtml}
            </div>
        `;

        canvas.appendChild(tray);
    });

    // 渲染幽靈容器 (Ghost Container)
    renderGhostMilestone(canvas);

    initMapSortable();
}

// 渲染幽靈容器
function renderGhostMilestone(canvas) {
    const ghostTray = document.createElement('div');
    ghostTray.className = 'milestone-tray border-dashed border-2 border-gray-200 bg-gray-50/30 transition-all flex flex-col justify-center relative ml-3 min-h-[120px]';
    ghostTray.setAttribute('data-parent-id', 'TEMP_NEW');

    ghostTray.innerHTML = `
        <div class="absolute top-0 bottom-1/2 -left-[19px] w-[2px] bg-gray-300 h-1/2"></div>
        <div class="absolute top-1/2 left-[calc(-19px-5px)] w-[10px] h-[10px] border-2 border-gray-300 rounded-full bg-white"></div>

        <div class="text-center text-gray-300 pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <i class="fa-solid fa-plus text-2xl mb-2 opacity-50"></i>
            <span class="text-[10px] font-bold tracking-widest uppercase opacity-70">Drag to Evolve</span>
        </div>

        <div class="map-task-list w-full h-full flex-grow z-10" data-parent-id="TEMP_NEW" style="min-height: 100px;">
        </div>
    `;

    canvas.appendChild(ghostTray);
}


// --- 3. 拖曳與排序邏輯 ---

function initMapSortable() {
    const lists = document.querySelectorAll('.map-task-list');

    lists.forEach(list => {
        new Sortable(list, {
            group: 'project-map',
            animation: 150,
            ghostClass: 'map-highlight',
            delay: 100,
            delayOnTouchOnly: true,

            onEnd: async function (evt) {
                const itemEl = evt.item;
                const newParentList = evt.to;
                const oldParentList = evt.from;

                if (newParentList === oldParentList && evt.newIndex === evt.oldIndex) return;

                const newParentId = newParentList.getAttribute('data-parent-id');
                const itemId = itemEl.getAttribute('data-id');

                // 拖進幽靈容器：建立新星級
                if (newParentId === 'TEMP_NEW') {
                    itemEl.classList.add('opacity-50', 'pointer-events-none');
                    newParentList.innerHTML = '<div class="flex h-full items-center justify-center"><div class="text-blue-400 text-xs font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-1"></i> EVOLVING...</div></div>';

                    try {
                        // 自動名稱：Evolution Node (前端不顯示，只存 DB)
                        const newMilestoneId = await apiCreateMilestone("Evolution Node");

                        if (newMilestoneId) {
                            await updateRelation(itemId, newMilestoneId, 'inherit');
                            openProjectMap(currentMapOriginId);
                        }
                    } catch (e) {
                        alert("建立失敗");
                        openProjectMap(currentMapOriginId);
                    }
                    return;
                }

                // 一般拖曳
                if (newParentId && itemId) {
                    itemEl.classList.add('bg-blue-50');
                    await updateRelation(itemId, newParentId, 'inherit');
                    itemEl.classList.remove('bg-blue-50');
                }

                sortListByDate(newParentList);
                updateTrayHeaderDate(newParentList.closest('.milestone-tray'));

                if (oldParentList !== newParentList) {
                    const oldTray = oldParentList.closest('.milestone-tray');
                    if (oldTray) updateTrayHeaderDate(oldTray);
                }
            }
        });
    });
}

async function apiCreateMilestone(title) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const today = (new Date(now - offset)).toISOString().split('T')[0];

    const res = await fetch('/project/add-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            origin_id: currentMapOriginId,
            title: title,
            date: today
        })
    });

    if (res.status === 405) {
        alert("API Error: 405. Please restart backend.");
        throw new Error("405");
    }

    const data = await res.json();
    if (data.status === 'success') {
        return data.item_id;
    }
    return null;
}

// --- 輔助函數 ---

function sortListByDate(container) {
    const items = Array.from(container.children);
    items.sort((a, b) => {
        const dateA = a.querySelector('.task-date')?.innerText.trim() || "";
        const dateB = b.querySelector('.task-date')?.innerText.trim() || "";
        return dateA.localeCompare(dateB);
    });
    items.forEach(item => container.appendChild(item));
}

function updateTrayHeaderDate(tray) {
    if (!tray) return;
    const baseDate = tray.getAttribute('data-base-date');
    const taskList = tray.querySelector('.map-task-list');
    const tasks = Array.from(taskList.children);
    let earliestDate = baseDate;
    if (tasks.length > 0) {
        const firstChildDate = tasks[0].querySelector('.task-date')?.innerText.trim();
        if (firstChildDate && firstChildDate < earliestDate) earliestDate = firstChildDate;
    }
    const dateLabel = tray.querySelector('.milestone-date');
    if (dateLabel) {
        dateLabel.innerText = earliestDate;
        if (earliestDate < baseDate) {
            dateLabel.classList.add('text-amber-600', 'bg-amber-100');
            dateLabel.classList.remove('text-gray-400', 'bg-gray-100');
        } else {
            dateLabel.classList.remove('text-amber-600', 'bg-amber-100');
            dateLabel.classList.add('text-gray-400', 'bg-gray-100');
        }
    }
}

function createMapTaskHtml(item) {
    const statusIcon = item.isDone ? '<i class="fa-solid fa-check text-green-500"></i>' : '<i class="fa-solid fa-circle-dot text-gray-300"></i>';
    const safeTitle = item.title.replace(/"/g, '&quot;');
    const isMilestoneTask = (item.relation_type === 'evolve');
    const borderClass = isMilestoneTask ? 'border-amber-200 bg-amber-50' : 'border-f1f5f9 bg-f8fafc';

    return `
        <div class="map-task-item ${borderClass}" data-id="${item.item_id}">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="text-xs w-4 flex justify-center">${statusIcon}</div>
                <div class="text-sm font-medium text-gray-600 truncate">${safeTitle}</div>
            </div>
            <div class="text-[9px] text-gray-300 font-mono ml-2 task-date">${item.date}</div>
        </div>
    `;
}

// ✅ 修改：物理刪除邏輯
async function deleteMilestone(milestoneId) {
    if (!confirm(`確定要移除此星級里程碑嗎？\n\n內部的任務將自動合併回 GENESIS。`)) {
        return;
    }

    const tray = document.getElementById(`tray-${milestoneId}`);
    if (tray) {
        tray.style.transition = 'all 0.5s';
        tray.style.opacity = '0';
        tray.style.transform = 'scale(0.9)';
    }

    try {
        // 1. 先將子任務全數歸建到 Genesis (Inherit)
        // 為了確保資料一致，我們透過遍歷前端的子任務來發送請求
        // (如果有批次更新 API 會更好，但目前用迴圈也足夠)
        if (tray) {
            const children = tray.querySelectorAll('.map-task-item');
            const movePromises = Array.from(children).map(child =>
                updateRelation(child.getAttribute('data-id'), currentMapOriginId, 'inherit')
            );
            await Promise.all(movePromises);
        }

        // 2. 物理刪除該里程碑 (呼叫新的 DELETE API)
        await fetch(`/project/item/${milestoneId}`, { method: 'DELETE' });

        // 3. 重新載入 (讓星星重新排序)
        setTimeout(() => { openProjectMap(currentMapOriginId); }, 500);

    } catch (e) {
        console.error("Delete failed", e);
        alert("移除失敗");
        if (tray) tray.style.opacity = '1';
    }
}

async function updateRelation(itemId, newParentId, relationType) {
    try {
        await fetch('/project/update-relation', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                target_parent_id: newParentId,
                relation_type: relationType
            })
        });
    } catch (e) {
        console.error("Update failed", e);
        throw e;
    }
}