export function renderStorytellingTimeline(history) {
    const sortOrder = document.getElementById('sort-order')?.value || 'desc';
    const qualityFilter = document.getElementById('filter-quality')?.value || 'all';
    const sortedHistory = [...history].sort((a, b) => sortOrder === 'desc' ? b.version - a.version : a.version - b.version);
    const filteredHistory = sortedHistory.filter(entry => {
        if (qualityFilter === 'all') return true;
        if (qualityFilter === 'high') return entry.metrics.quality > 8.0;
        if (qualityFilter === 'medium') return entry.metrics.quality >= 6.0 && entry.metrics.quality <= 8.0;
        if (qualityFilter === 'low') return entry.metrics.quality < 6.0;
        return true;
    });

    const timeline = document.createElement('div');
    timeline.className = 'flex flex-col gap-6';
    filteredHistory.forEach((entry, index) => {
        const node = document.createElement('div');
        node.className = 'p-4 bg-gray-800 rounded-lg';
        node.innerHTML = `
            <h4 class="font-bold">Wersja ${entry.version}</h4>
            <p class="text-gray-400">Quality: ${entry.metrics.quality}/10 | Consensus: ${Math.round(entry.metrics.consensus * 100)}%</p>
            <div class="hidden details mt-2 text-sm">${JSON.stringify(entry.contributions, null, 2)}</div>
            <div class="mt-2 text-gray-500">Timestamp: ${new Date(entry.timestamp).toLocaleString()}</div>
        `;
        node.addEventListener('click', () => {
            const details = node.querySelector('.details');
            details.classList.toggle('hidden');
        });
        timeline.appendChild(node);
        if (index < filteredHistory.length - 1) {
            const connector = document.createElement('div');
            connector.className = 'h-6 mx-auto w-2 bg-gradient-to-b from-blue-500 to-green-500';
            timeline.appendChild(connector);
        }
    });

    const ideaHistory = document.getElementById('idea-history');
    ideaHistory.innerHTML = '';
    ideaHistory.appendChild(timeline);

    const totalVersions = filteredHistory.length;
    const avgQuality = filteredHistory.reduce((sum, entry) => sum + entry.metrics.quality, 0) / totalVersions || 0;
    const avgConsensus = filteredHistory.reduce((sum, entry) => sum + entry.metrics.consensus, 0) / totalVersions || 0;
    document.getElementById('total-versions').textContent = totalVersions;
    document.getElementById('avg-quality').textContent = avgQuality.toFixed(1);
    document.getElementById('avg-consensus').textContent = `${(avgConsensus * 100).toFixed(1)}%`;

    const bestVersion = filteredHistory.reduce((best, entry) => entry.metrics.quality > best.metrics.quality ? entry : best, filteredHistory[0]);
    document.getElementById('best-version').innerHTML = bestVersion ? `Wersja ${bestVersion.version}: Quality ${bestVersion.metrics.quality}, Consensus ${(bestVersion.metrics.consensus * 100).toFixed(1)}%` : 'Brak danych';
}

export function initKitsune(studio) {
    if (studio.stats.evolution.consensus >= 0.85 && studio.stats.evolution.breakthroughs === studio.stats.evolution.lastBreakthroughs) {
        const newTopicPrompt = `Na podstawie "${studio.contributions.synthesizer}", zaproponuj nowy problem pokrewny.`;
        callAPI('builder1', '', newTopicPrompt, studio.circuitBreaker).then(newTopic => {
            document.getElementById('topic-input').value = newTopic;
            addMessage('System', `[Kitsune] Nowy problem: ${newTopic}`, 'system');
        });
    }
    studio.stats.evolution.lastBreakthroughs = studio.stats.evolution.breakthroughs;
}