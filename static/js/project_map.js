/**
 * Project Map Module (static/js/project_map.js)
 * 負責視覺化專案進化樹，並提供拖曳重整功能 (Low Coupling Design)
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

    // 顯示 Modal (Loading 狀態)
    modal.classList.remove('hidden');
    canvas.innerHTML = '<div class="text-center py-20 text-gray-400"><i class="fa-solid fa-dna fa-spin text-3xl"></i><p class="mt-4 text-xs font-bold tracking-widest">DECODING DNA...</p></div>';

    try {
        // 呼叫後端 API
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

function closeProjectMap() {
    document.getElementById('project-map-modal').classList.add('hidden');
    currentMapOriginId = null;
}

// --- 2. 核心渲染邏輯 (The Evolution Renderer) ---

function renderProjectMap(treeData) {
    const canvas = document.getElementById('project-map-canvas');

    // 更新頂部資訊看板
    if (treeData.length > 0) {
        // 找出始祖節點 (時間最早的)
        const rootItem = treeData[0];
        document.getElementById('map-project-title').innerText = rootItem.title;
        document.getElementById('map-origin-date').innerText = `Origin: ${rootItem.date}`;

        // 計算總投入天數 (不重複日期)
        const uniqueDays = new Set(treeData.map(i => i.date)).size;
        document.getElementById('map-total-days').innerText = `${uniqueDays} DAYS EVOLVED`;
    }

    canvas.innerHTML = ''; // 清空畫布

    // --- 資料分組演算法 ---
    // 我們將 relation_type == 'evolve' (或 root) 視為「里程碑容器」
    // 其他 items 則掛在「當前最新」的里程碑下

    let milestones = [];
    let currentMilestone = null;

    treeData.forEach(item => {
        // 判斷是否為新里程碑：如果是 Evolve、或是 Root、或是還沒有任何里程碑時
        if (item.relation_type === 'evolve' || item.relation_type === 'root' || !currentMilestone) {
            currentMilestone = {
                ...item,
                children: [] // 準備裝載子任務
            };
            milestones.push(currentMilestone);
        } else {
            // 繼承任務 (Inherit)，掛在當前最新的里程碑下
            currentMilestone.children.push(item);
        }
    });

    // --- DOM 生成 ---
    milestones.forEach((ms, index) => {
        const tray = document.createElement('div');
        tray.className = 'milestone-tray group';
        // 設置 data-parent-id，這對拖曳至關重要，代表這個托盤的 ID
        tray.setAttribute('data-parent-id', ms.item_id);

        const isRoot = index === 0;
        // 視覺區分：Root 用綠色，Evolve 用琥珀色
        const nodeClass = isRoot ? 'node-root' : 'node-evolve';
        const badgeClass = isRoot ? 'badge-root' : 'badge-evolve';
        const icon = isRoot ? 'fa-seedling' : 'fa-shuttle-space';
        const label = isRoot ? 'GENESIS' : `MILESTONE ${index}`;

        // 生成子任務 HTML
        let childrenHtml = ms.children.map(child => createMapTaskHtml(child)).join('');

        // 雖然里程碑本身也是一個任務，但在地圖上我們把它顯示為「托盤標題」，
        // 而不是列表裡的一個項目，這樣視覺上更像一個「階段」。
        tray.innerHTML = `
            <div class="milestone-node ${nodeClass}"></div>

            <div class="mb-4 pl-2">
                <div class="evo-badge ${badgeClass}">
                    <i class="fa-solid ${icon}"></i>
                    <span>${label}</span>
                </div>
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-gray-800 text-lg leading-tight">${ms.title}</h3>
                    <span class="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded ml-2 whitespace-nowrap">${ms.date}</span>
                </div>
                <div class="text-xs text-gray-400 mt-1 pl-1 border-l-2 border-gray-100 italic">
                    ${ms.tags ? '#' + ms.tags.split(' ').join(' #') : ''}
                </div>
            </div>

            <div class="map-task-list space-y-2 min-h-[40px] pb-2" data-parent-id="${ms.item_id}">
                ${childrenHtml}
            </div>
        `;

        canvas.appendChild(tray);
    });

    // 初始化拖曳監聽
    initMapSortable();
}

function createMapTaskHtml(item) {
    const statusIcon = item.isDone ? '<i class="fa-solid fa-check text-green-500"></i>' : '<i class="fa-solid fa-circle-dot text-gray-300"></i>';
    // 轉義單引號防止 XSS
    const safeTitle = item.title.replace(/"/g, '&quot;');

    return `
        <div class="map-task-item" data-id="${item.item_id}">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="text-xs w-4 flex justify-center">${statusIcon}</div>
                <div class="text-sm font-medium text-gray-600 truncate">${safeTitle}</div>
            </div>
            <div class="text-[9px] text-gray-300 font-mono ml-2">${item.date}</div>
        </div>
    `;
}

// --- 3. 拖曳與關係更新 (Drag-to-Reparent) ---

function initMapSortable() {
    const lists = document.querySelectorAll('.map-task-list');

    lists.forEach(list => {
        new Sortable(list, {
            group: 'project-map', // 允許跨里程碑拖曳
            animation: 150,
            ghostClass: 'map-highlight',
            delay: 100, // 防止手機誤觸
            delayOnTouchOnly: true,

            onEnd: async function (evt) {
                const itemEl = evt.item;
                const newParentList = evt.to; // 拖放到的目標容器
                const oldParentList = evt.from;

                // 如果位置沒變，什麼都不做
                if (newParentList === oldParentList && evt.newIndex === evt.oldIndex) return;

                // 獲取新的父節點 ID (這裡是目標托盤的 data-parent-id)
                const newParentId = newParentList.getAttribute('data-parent-id');
                const itemId = itemEl.getAttribute('data-id');

                if (newParentId && itemId) {
                    // UI 上先變色提示正在儲存
                    itemEl.classList.add('bg-blue-50');
                    await updateRelation(itemId, newParentId);
                    itemEl.classList.remove('bg-blue-50');
                }
            }
        });
    });
}

async function updateRelation(itemId, newParentId) {
    try {
        console.log(`[Project Map] Updating relation: Item ${itemId} -> New Parent ${newParentId}`);

        const res = await fetch('/project/update-relation', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                target_parent_id: newParentId,
                relation_type: 'inherit' // 拖進去一律視為繼承關係
            })
        });

        const data = await res.json();
        if (data.status !== 'success') throw new Error(data.detail);

    } catch (e) {
        alert("Update failed. Please refresh.");
        console.error(e);
        // 這裡可以做 revert UI 的邏輯，但為了保持簡單，失敗時建議重新整理
    }
}