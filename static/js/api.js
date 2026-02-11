const API_BASE = "http://127.0.0.1:8000";

// --- 日誌相關 ---
async function apiGetLog(date) {
    const res = await fetch(`${API_BASE}/get-log/${date}`, { cache: "no-store" });
    return await res.json();
}

async function apiSaveLog(date, items) {
    const res = await fetch(`${API_BASE}/save-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, items })
    });
    return res.ok;
}

async function apiGetProjectHistory(title, tags) {
    const url = `${API_BASE}/get-project-history?title=${encodeURIComponent(title)}&tags=${encodeURIComponent(tags)}`;
    const res = await fetch(url);
    return await res.json();
}

async function apiGetAllLogs() {
    const res = await fetch(`${API_BASE}/get-all-logs`);
    return await res.json();
}

// --- 原子習慣相關 ---

async function apiGetHabits(date) {
    const res = await fetch(`${API_BASE}/get-habits?date=${date}`);
    return await res.json();
}

async function apiAddHabit(habitData) {
    const res = await fetch(`${API_BASE}/add-habit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData)
    });
    return await res.json();
}

async function apiToggleHabit(date, habitId, status) {
    const res = await fetch(`${API_BASE}/toggle-habit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date, habit_id: habitId, status: status })
    });
    return await res.json();
}

async function apiMarkAllHabitsDone(date) {
    const res = await fetch(`${API_BASE}/mark-all-done?date=${date}`, { method: 'POST' });
    return await res.json();
}

// [更新] 支援 title, color, group_id, is_archived 任意組合
async function apiUpdateHabit(id, { title, color, group_id }) {
    const payload = { habit_id: id };
    if (title !== undefined) payload.title = title;
    if (color !== undefined) payload.color = color;
    if (group_id !== undefined) payload.group_id = group_id;

    const res = await fetch(`${API_BASE}/update-habit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

async function apiDeleteHabit(id) {
    const res = await fetch(`${API_BASE}/delete-habit/${id}`, { method: 'DELETE' });
    return await res.json();
}