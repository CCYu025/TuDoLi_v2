const API_BASE = "http://127.0.0.1:8000";

async function apiGetLog(date) {
    const res = await fetch(`${API_BASE}/get-log/${date}`);
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