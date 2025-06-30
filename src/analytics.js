/**
 * Advanced Analytics Dashboard
 * Provides deep insights into problem-solving sessions and AI performance
 */

export class AnalyticsDashboard {
    constructor() {
        this.sessions = [];
        this.realTimeMetrics = {
            activeSession: null,
            currentIteration: 0,
            liveQuality: 0,
            liveConsensus: 0,
            performanceTrend: []
        };
        
        this.initializeCharts();
    }

    /**
     * Inicjalizuje wykresy i komponenty analityczne
     */
    initializeCharts() {
        // Create analytics container if not exists
        if (!document.getElementById('analytics-dashboard')) {
            this.createDashboard();
        }
    }

    /**
     * Tworzy główny dashboard analityczny
     */
    createDashboard() {
        const dashboardHTML = `
            <div id="analytics-dashboard" class="mt-6 bg-gray-800 p-6 rounded-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">📊 Advanced Analytics</h2>
                    <div class="flex gap-2">
                        <button id="toggle-realtime" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm">
                            🔴 Real-time
                        </button>
                        <button id="export-analytics" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                            📈 Export Data
                        </button>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-900 p-4 rounded-lg text-center">
                        <h3 class="text-gray-400 text-sm">Avg Session Quality</h3>
                        <p id="avg-session-quality" class="text-2xl font-bold text-green-400">0.0</p>
                        <div class="text-xs text-gray-500 mt-1">
                            <span id="quality-trend" class="inline-flex items-center">
                                📈 +0.0%
                            </span>
                        </div>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg text-center">
                        <h3 class="text-gray-400 text-sm">Consensus Rate</h3>
                        <p id="avg-consensus-rate" class="text-2xl font-bold text-blue-400">0%</p>
                        <div class="text-xs text-gray-500 mt-1">
                            <span id="consensus-trend" class="inline-flex items-center">
                                📊 +0.0%
                            </span>
                        </div>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg text-center">
                        <h3 class="text-gray-400 text-sm">Avg Solve Time</h3>
                        <p id="avg-solve-time" class="text-2xl font-bold text-purple-400">0s</p>
                        <div class="text-xs text-gray-500 mt-1">
                            <span id="time-trend" class="inline-flex items-center">
                                ⏱️ -0.0%
                            </span>
                        </div>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg text-center">
                        <h3 class="text-gray-400 text-sm">Success Rate</h3>
                        <p id="success-rate" class="text-2xl font-bold text-yellow-400">0%</p>
                        <div class="text-xs text-gray-500 mt-1">
                            <span id="success-trend" class="inline-flex items-center">
                                🎯 +0.0%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Real-time Performance Chart -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <h3 class="text-lg font-medium mb-3">Real-time Performance</h3>
                        <canvas id="performance-chart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <h3 class="text-lg font-medium mb-3">Consensus Evolution</h3>
                        <canvas id="consensus-chart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- AI Roles Performance -->
                <div class="bg-gray-900 p-4 rounded-lg mb-6">
                    <h3 class="text-lg font-medium mb-3">AI Roles Performance</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center p-3 bg-gray-800 rounded">
                            <div class="text-sm text-gray-400">Architect</div>
                            <div id="architect-score" class="text-xl font-bold text-cyan-400">8.2</div>
                            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div id="architect-bar" class="bg-cyan-400 h-2 rounded-full" style="width: 82%"></div>
                            </div>
                        </div>
                        
                        <div class="text-center p-3 bg-gray-800 rounded">
                            <div class="text-sm text-gray-400">Catalyst</div>
                            <div id="catalyst-score" class="text-xl font-bold text-orange-400">7.8</div>
                            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div id="catalyst-bar" class="bg-orange-400 h-2 rounded-full" style="width: 78%"></div>
                            </div>
                        </div>
                        
                        <div class="text-center p-3 bg-gray-800 rounded">
                            <div class="text-sm text-gray-400">Synthesizer</div>
                            <div id="synthesizer-score" class="text-xl font-bold text-green-400">8.7</div>
                            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div id="synthesizer-bar" class="bg-green-400 h-2 rounded-full" style="width: 87%"></div>
                            </div>
                        </div>
                        
                        <div class="text-center p-3 bg-gray-800 rounded">
                            <div class="text-sm text-gray-400">Evaluator</div>
                            <div id="evaluator-score" class="text-xl font-bold text-purple-400">8.1</div>
                            <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div id="evaluator-bar" class="bg-purple-400 h-2 rounded-full" style="width: 81%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Session History Table -->
                <div class="bg-gray-900 p-4 rounded-lg">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-lg font-medium">Session History</h3>
                        <div class="flex gap-2">
                            <select id="filter-timerange" class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                            <input type="text" id="search-sessions" placeholder="Search..." 
                                   class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm w-32">
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-gray-700">
                                    <th class="text-left p-2">Problem</th>
                                    <th class="text-left p-2">Quality</th>
                                    <th class="text-left p-2">Consensus</th>
                                    <th class="text-left p-2">Time</th>
                                    <th class="text-left p-2">Iterations</th>
                                    <th class="text-left p-2">Date</th>
                                    <th class="text-left p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="sessions-table-body">
                                <tr>
                                    <td colspan="7" class="text-center p-4 text-gray-400">
                                        No sessions recorded yet
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Insert dashboard after existing content
        const container = document.querySelector('.container');
        container.insertAdjacentHTML('beforeend', dashboardHTML);

        // Initialize event listeners
        this.initializeEventListeners();
        this.initializeSimpleCharts();
    }

    /**
     * Inicjalizuje event listenery dla dashboard
     */
    initializeEventListeners() {
        // Real-time toggle
        document.getElementById('toggle-realtime')?.addEventListener('click', () => {
            this.toggleRealTimeMode();
        });

        // Export analytics
        document.getElementById('export-analytics')?.addEventListener('click', () => {
            this.exportAnalytics();
        });

        // Filter sessions
        document.getElementById('filter-timerange')?.addEventListener('change', (e) => {
            this.filterSessions(e.target.value);
        });

        // Search sessions
        document.getElementById('search-sessions')?.addEventListener('input', (e) => {
            this.searchSessions(e.target.value);
        });
    }

    /**
     * Inicjalizuje proste wykresy ASCII/CSS
     */
    initializeSimpleCharts() {
        // Create simple performance chart using CSS
        const performanceChart = document.getElementById('performance-chart');
        const consensusChart = document.getElementById('consensus-chart');
        
        if (performanceChart) {
            performanceChart.style.display = 'none';
            performanceChart.parentElement.innerHTML += `
                <div class="simple-chart">
                    <div class="chart-line quality-line" style="height: 60%; background: linear-gradient(90deg, transparent 0%, #10b981 100%);"></div>
                    <div class="chart-line consensus-line" style="height: 40%; background: linear-gradient(90deg, transparent 0%, #3b82f6 100%); margin-top: 10px;"></div>
                    <div class="text-xs text-gray-400 mt-2">
                        <span class="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Quality
                        <span class="inline-block w-3 h-3 bg-blue-500 rounded mr-2 ml-4"></span>Consensus
                    </div>
                </div>
            `;
        }

        if (consensusChart) {
            consensusChart.style.display = 'none';
            consensusChart.parentElement.innerHTML += `
                <div class="consensus-evolution">
                    <div class="evolution-step" style="height: 20%; width: 15%; background: #ef4444; margin-bottom: 5px;">Iter 1</div>
                    <div class="evolution-step" style="height: 45%; width: 25%; background: #f59e0b; margin-bottom: 5px;">Iter 2</div>
                    <div class="evolution-step" style="height: 70%; width: 35%; background: #10b981; margin-bottom: 5px;">Iter 3</div>
                    <div class="evolution-step" style="height: 85%; width: 45%; background: #22c55e;">Final</div>
                </div>
            `;
        }
    }

    /**
     * Rejestruje nową sesję w analytics
     */
    recordSession(session) {
        const sessionRecord = {
            id: Date.now(),
            problem: session.problem.substring(0, 50) + '...',
            startTime: session.startTime,
            endTime: Date.now(),
            totalTime: session.metrics.totalTime,
            avgQuality: session.metrics.avgQuality,
            finalConsensus: session.metrics.finalConsensus,
            iterationsUsed: session.iterations.length,
            breakthroughs: session.metrics.breakthroughs,
            efficiency: session.metrics.efficiency,
            success: session.metrics.avgQuality >= 7.5 && session.metrics.finalConsensus >= 0.75
        };

        this.sessions.push(sessionRecord);
        this.updateDashboard();
        this.updateSessionsTable();
        
        // Store in localStorage
        localStorage.setItem('ies_analytics', JSON.stringify(this.sessions));
    }

    /**
     * Aktualizuje główne wskaźniki dashboard
     */
    updateDashboard() {
        if (this.sessions.length === 0) return;

        const avgQuality = this.sessions.reduce((sum, s) => sum + s.avgQuality, 0) / this.sessions.length;
        const avgConsensus = this.sessions.reduce((sum, s) => sum + s.finalConsensus, 0) / this.sessions.length;
        const avgTime = this.sessions.reduce((sum, s) => sum + s.totalTime, 0) / this.sessions.length;
        const successRate = (this.sessions.filter(s => s.success).length / this.sessions.length) * 100;

        // Update KPI cards
        document.getElementById('avg-session-quality').textContent = avgQuality.toFixed(1);
        document.getElementById('avg-consensus-rate').textContent = `${(avgConsensus * 100).toFixed(1)}%`;
        document.getElementById('avg-solve-time').textContent = `${Math.round(avgTime / 1000)}s`;
        document.getElementById('success-rate').textContent = `${successRate.toFixed(1)}%`;

        // Update trends (simplified)
        this.updateTrends();
    }

    /**
     * Aktualizuje trendy w KPI cards
     */
    updateTrends() {
        if (this.sessions.length < 2) return;

        const recent = this.sessions.slice(-5);
        const older = this.sessions.slice(-10, -5);

        if (older.length === 0) return;

        const recentAvgQuality = recent.reduce((sum, s) => sum + s.avgQuality, 0) / recent.length;
        const olderAvgQuality = older.reduce((sum, s) => sum + s.avgQuality, 0) / older.length;
        
        const qualityTrend = ((recentAvgQuality - olderAvgQuality) / olderAvgQuality * 100);
        
        document.getElementById('quality-trend').innerHTML = qualityTrend >= 0 
            ? `📈 +${qualityTrend.toFixed(1)}%`
            : `📉 ${qualityTrend.toFixed(1)}%`;
    }

    /**
     * Aktualizuje tabelę sesji
     */
    updateSessionsTable() {
        const tbody = document.getElementById('sessions-table-body');
        if (!tbody) return;

        if (this.sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-4 text-gray-400">
                        No sessions recorded yet
                    </td>
                </tr>
            `;
            return;
        }

        const rows = this.sessions.slice(-10).reverse().map(session => {
            const date = new Date(session.startTime).toLocaleDateString();
            const time = new Date(session.startTime).toLocaleTimeString();
            
            return `
                <tr class="border-b border-gray-700 hover:bg-gray-800">
                    <td class="p-2">${session.problem}</td>
                    <td class="p-2">
                        <span class="px-2 py-1 rounded text-xs ${session.avgQuality >= 8 ? 'bg-green-600' : session.avgQuality >= 6 ? 'bg-yellow-600' : 'bg-red-600'}">
                            ${session.avgQuality.toFixed(1)}
                        </span>
                    </td>
                    <td class="p-2">${(session.finalConsensus * 100).toFixed(1)}%</td>
                    <td class="p-2">${Math.round(session.totalTime / 1000)}s</td>
                    <td class="p-2">${session.iterationsUsed}</td>
                    <td class="p-2">${date}</td>
                    <td class="p-2">
                        <button class="text-blue-400 hover:text-blue-300 text-xs" onclick="analytics.viewSession('${session.id}')">
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    /**
     * Aktualizuje metryki w czasie rzeczywistym
     */
    updateRealTimeMetrics(metrics) {
        this.realTimeMetrics = { ...this.realTimeMetrics, ...metrics };
        
        // Update live indicators if real-time mode is active
        if (this.isRealTimeActive) {
            this.updateLiveIndicators();
        }
    }

    /**
     * Aktualizuje wskaźniki live
     */
    updateLiveIndicators() {
        // Update AI roles performance
        const { liveQuality, liveConsensus } = this.realTimeMetrics;
        
        // Simulate individual role scores based on current metrics
        const architectScore = Math.min(10, liveQuality + Math.random() * 0.5);
        const catalystScore = Math.min(10, liveQuality + Math.random() * 0.5 - 0.2);
        const synthesizerScore = Math.min(10, liveQuality + Math.random() * 0.3);
        const evaluatorScore = Math.min(10, liveQuality + Math.random() * 0.4 - 0.1);

        document.getElementById('architect-score').textContent = architectScore.toFixed(1);
        document.getElementById('catalyst-score').textContent = catalystScore.toFixed(1);
        document.getElementById('synthesizer-score').textContent = synthesizerScore.toFixed(1);
        document.getElementById('evaluator-score').textContent = evaluatorScore.toFixed(1);

        // Update progress bars
        document.getElementById('architect-bar').style.width = `${architectScore * 10}%`;
        document.getElementById('catalyst-bar').style.width = `${catalystScore * 10}%`;
        document.getElementById('synthesizer-bar').style.width = `${synthesizerScore * 10}%`;
        document.getElementById('evaluator-bar').style.width = `${evaluatorScore * 10}%`;
    }

    /**
     * Przełącza tryb real-time
     */
    toggleRealTimeMode() {
        this.isRealTimeActive = !this.isRealTimeActive;
        const button = document.getElementById('toggle-realtime');
        
        if (this.isRealTimeActive) {
            button.innerHTML = '🟢 Real-time';
            button.className = button.className.replace('bg-green-600', 'bg-red-600');
            this.startRealTimeUpdates();
        } else {
            button.innerHTML = '🔴 Real-time';
            button.className = button.className.replace('bg-red-600', 'bg-green-600');
            this.stopRealTimeUpdates();
        }
    }

    /**
     * Rozpoczyna aktualizacje real-time
     */
    startRealTimeUpdates() {
        this.realTimeInterval = setInterval(() => {
            this.updateLiveIndicators();
        }, 1000);
    }

    /**
     * Zatrzymuje aktualizacje real-time
     */
    stopRealTimeUpdates() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
    }

    /**
     * Eksportuje dane analityczne
     */
    exportAnalytics() {
        const data = {
            sessions: this.sessions,
            summary: {
                totalSessions: this.sessions.length,
                avgQuality: this.sessions.reduce((sum, s) => sum + s.avgQuality, 0) / this.sessions.length,
                avgConsensus: this.sessions.reduce((sum, s) => sum + s.finalConsensus, 0) / this.sessions.length,
                successRate: (this.sessions.filter(s => s.success).length / this.sessions.length) * 100
            },
            exportTimestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ies_analytics_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Filtruje sesje według zakresu czasowego
     */
    filterSessions(timeRange) {
        // Implementation for filtering sessions
        console.log(`Filtering sessions by: ${timeRange}`);
    }

    /**
     * Wyszukuje sesje
     */
    searchSessions(query) {
        // Implementation for searching sessions
        console.log(`Searching sessions: ${query}`);
    }

    /**
     * Ładuje dane z localStorage
     */
    loadStoredData() {
        const stored = localStorage.getItem('ies_analytics');
        if (stored) {
            this.sessions = JSON.parse(stored);
            this.updateDashboard();
            this.updateSessionsTable();
        }
    }
}

// Export singleton instance
export const analytics = new AnalyticsDashboard();

// Load stored data on initialization
analytics.loadStoredData();

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
    window.analytics = analytics;
}
