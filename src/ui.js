export function showExportModal(studio) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg max-w-md w-full text-white">
            <h3 class="text-xl font-semibold mb-4">Eksport Danych IES</h3>
            <div class="mb-4">
                <label class="block text-gray-400 mb-2">Format:</label>
                <select id="export-format" class="w-full p-2 bg-gray-900 border border-gray-600 rounded">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" id="include-history" checked class="mr-2">
                    <span>Dołącz historię</span>
                </label>
            </div>
            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" id="include-metrics" checked class="mr-2">
                    <span>Dołącz metryki</span>
                </label>
            </div>
            <div class="flex gap-3">
                <button id="modal-export" class="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Eksportuj</button>
                <button id="modal-cancel" class="flex-1 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Anuluj</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-export').addEventListener('click', () => {
        const format = modal.querySelector('#export-format').value;
        const includeHistory = modal.querySelector('#include-history').checked;
        const includeMetrics = modal.querySelector('#include-metrics').checked;
        const exportData = {
            problem: studio.problem,
            timestamp: new Date().toISOString()
        };
        if (includeHistory) exportData.history = studio.ideaHistory;
        if (includeMetrics) exportData.stats = studio.stats;
        const content = format === 'json'
            ? JSON.stringify(exportData, null, 2)
            : `Problem,Quality,Consensus,Breakthroughs,Timestamp\n${exportData.problem},${exportData.stats?.evolution.quality || 'N/A'},${exportData.stats?.evolution.consensus || 'N/A'},${exportData.stats?.evolution.breakthroughs || 'N/A'},${exportData.timestamp}`;
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ies_export.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        modal.remove();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.remove();
    });
}

export function updateProgressBar(stage, progress) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}% - ${stage}`;
    if (progress >= 100) {
        progressText.textContent = 'Completed';
    }
}

import { DatabaseSessionManager } from './database_session_manager.js';

export async function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Update UI immediately
    document.documentElement.classList.toggle('dark');
    document.getElementById('current-theme').textContent = newTheme;
    
    try {
        const dbManager = new DatabaseSessionManager();
        const userId = 'default_user'; // Replace with actual user ID when user system is implemented
        
        // Get current user profile
        let profile = await dbManager.getUserProfile(userId);
        if (!profile) {
            profile = { preferences: {} };
        }
        
        // Update theme preference
        profile.preferences.theme = newTheme;
        
        // Save to database
        await dbManager.saveUserProfile(userId, profile);
        
        console.log(`Theme changed to ${newTheme} and saved to database`);
    } catch (error) {
        console.error('Failed to save theme to database, falling back to localStorage:', error);
        // Fallback to localStorage if database fails
        localStorage.setItem('theme', newTheme);
    }
}

export function initSSE() {
    const eventSource = new EventSource('/api/sse/updates');
    const log = document.getElementById('sse-log');
    const status = document.getElementById('sse-status');
    status.textContent = 'Łączenie...';
    
    eventSource.onopen = () => {
        status.textContent = 'Połączony';
        log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] Połączenie SSE ustanowione</div>`;
    };
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${data.type}: ${JSON.stringify(data.payload)}</div>`;
        log.scrollTop = log.scrollHeight;
    };
    
    eventSource.onerror = () => {
        status.textContent = 'Błąd';
        log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] Błąd połączenia, próba ponownego połączenia...</div>`;
        eventSource.close();
        setTimeout(() => initSSE(), 3000);
    };
    
    return eventSource;
}