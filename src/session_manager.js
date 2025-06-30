/**
 * Smart Session Management System
 * Zarządza sesjami rozwiązywania problemów z persistence, recovery i smart resume
 * REFACTORED: Now uses PostgreSQL instead of localStorage for persistence
 */

import { analytics } from './analytics.js';
import { query, pool } from './db.js';

export class SessionManager {
    constructor() {
        this.currentSession = null;
        this.sessionHistory = [];
        this.autoSaveInterval = null;
        this.maxSessions = 50; // Limit stored sessions
        this.currentUserId = 1; // TODO: Get from auth system
        
        this.initializeStorage();
        this.setupAutoRecovery();
    }

    /**
     * Inicjalizuje storage i ładuje saved sessions z PostgreSQL
     */
    async initializeStorage() {
        try {
            // Load session history from PostgreSQL - get recent completed sessions
            const historyResult = await query(`
                SELECT s.*, 
                       array_agg(
                           json_build_object(
                               'number', si.iteration_number,
                               'timestamp', extract(epoch from si.created_at) * 1000,
                               'sessionTime', si.session_time_ms,
                               'data', si.iteration_data
                           ) ORDER BY si.iteration_number
                       ) as iterations
                FROM sessions s
                LEFT JOIN session_iterations si ON s.id = si.session_id
                WHERE s.user_id = $1 AND s.status = 'completed'
                GROUP BY s.id
                ORDER BY s.end_time DESC
                LIMIT $2
            `, [this.currentUserId, this.maxSessions]);
            
            this.sessionHistory = historyResult.rows.map(row => ({
                id: row.session_id,
                problem: row.problem_statement,
                startTime: new Date(row.start_time).getTime(),
                endTime: row.end_time ? new Date(row.end_time).getTime() : null,
                lastSaveTime: new Date(row.updated_at).getTime(),
                iterations: row.iterations.filter(iter => iter.number !== null) || [],
                status: row.status,
                progress: row.progress_data || { currentStage: 'completed', completion: 100 },
                metadata: row.metadata || {},
                metrics: row.metrics || {},
                completed: row.status === 'completed'
            }));
            
            console.log(`📂 Loaded ${this.sessionHistory.length} sessions from PostgreSQL`);

            // Load current active session if exists
            const currentResult = await query(`
                SELECT s.*, 
                       array_agg(
                           json_build_object(
                               'number', si.iteration_number,
                               'timestamp', extract(epoch from si.created_at) * 1000,
                               'sessionTime', si.session_time_ms,
                               'data', si.iteration_data
                           ) ORDER BY si.iteration_number
                       ) as iterations
                FROM sessions s
                LEFT JOIN session_iterations si ON s.id = si.session_id
                WHERE s.user_id = $1 AND s.status IN ('active', 'paused')
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT 1
            `, [this.currentUserId]);
            
            if (currentResult.rows.length > 0) {
                const row = currentResult.rows[0];
                this.currentSession = {
                    id: row.session_id,
                    problem: row.problem_statement,
                    startTime: new Date(row.start_time).getTime(),
                    endTime: row.end_time ? new Date(row.end_time).getTime() : null,
                    lastSaveTime: new Date(row.updated_at).getTime(),
                    iterations: row.iterations.filter(iter => iter.number !== null) || [],
                    status: row.status,
                    progress: row.progress_data || { currentStage: 'initialization', completion: 0 },
                    metadata: row.metadata || {},
                    metrics: row.metrics || {},
                    completed: false,
                    pausedAt: row.status === 'paused' ? new Date(row.updated_at).getTime() : null
                };
                
                console.log(`🔄 Recovered current session from PostgreSQL: ${this.currentSession.problem.substring(0, 30)}...`);
                this.showRecoveryNotification();
            }
        } catch (error) {
            console.error('Failed to load sessions from PostgreSQL:', error);
            this.sessionHistory = [];
            this.currentSession = null;
        }
    }

    /**
     * Pokazuje powiadomienie o możliwości recovery
     */
    showRecoveryNotification() {
        if (!this.currentSession) return;

        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-2xl">🔄</span>
                <div class="flex-1">
                    <h4 class="font-semibold mb-1">Session Recovery</h4>
                    <p class="text-sm text-blue-100 mb-3">
                        Found interrupted session: "${this.currentSession.problem.substring(0, 40)}..."
                    </p>
                    <div class="flex gap-2">
                        <button id="resume-session" class="px-3 py-1 bg-blue-500 rounded text-xs hover:bg-blue-400">
                            Resume
                        </button>
                        <button id="discard-session" class="px-3 py-1 bg-gray-500 rounded text-xs hover:bg-gray-400">
                            Discard
                        </button>
                    </div>
                </div>
                <button id="close-notification" class="text-blue-200 hover:text-white">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Event listeners
        notification.querySelector('#resume-session').addEventListener('click', () => {
            this.resumeSession();
            notification.remove();
        });

        notification.querySelector('#discard-session').addEventListener('click', () => {
            this.discardCurrentSession();
            notification.remove();
        });

        notification.querySelector('#close-notification').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * Tworzy nową sesję
     */
    createSession(problemStatement, options = {}) {
        // Save previous session if exists
        if (this.currentSession && !this.currentSession.completed) {
            this.saveSessionToHistory(this.currentSession);
        }

        this.currentSession = {
            id: this.generateSessionId(),
            problem: problemStatement,
            startTime: Date.now(),
            lastSaveTime: Date.now(),
            iterations: [],
            status: 'active', // active, paused, completed, failed
            progress: {
                currentStage: 'initialization',
                completion: 0,
                estimatedTimeRemaining: null
            },
            metadata: {
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                version: '1.0.0',
                ...options
            },
            metrics: {
                startTime: Date.now(),
                totalTime: 0,
                pausedTime: 0,
                activeTime: 0
            },
            completed: false
        };

        this.startAutoSave();
        this.updateSessionUI();
        
        console.log(`🚀 Created new session: ${this.currentSession.id}`);
        return this.currentSession;
    }

    /**
     * Aktualizuje current session z nowymi danymi
     */
    updateSession(updates) {
        if (!this.currentSession) {
            console.warn('No active session to update');
            return;
        }

        // Deep merge updates
        this.currentSession = this.deepMerge(this.currentSession, updates);
        this.currentSession.lastSaveTime = Date.now();
        
        // Auto-save current session
        this.saveCurrentSession();
        this.updateSessionUI();
    }

    /**
     * Dodaje iterację do current session
     */
    addIteration(iteration) {
        if (!this.currentSession) {
            console.warn('No active session to add iteration to');
            return;
        }

        iteration.timestamp = Date.now();
        iteration.sessionTime = Date.now() - this.currentSession.startTime;
        
        this.currentSession.iterations.push(iteration);
        this.updateSession({
            progress: {
                currentStage: `Iteration ${iteration.number}`,
                completion: Math.min(95, (iteration.number / 8) * 100)
            }
        });

        console.log(`📝 Added iteration ${iteration.number} to session ${this.currentSession.id}`);
    }

    /**
     * Kończy current session
     */
    async completeSession(finalMetrics = {}) {
        if (!this.currentSession) {
            console.warn('No active session to complete');
            return;
        }

        const completedSession = {
            ...this.currentSession,
            endTime: Date.now(),
            completed: true,
            status: 'completed',
            finalMetrics: {
                ...finalMetrics,
                totalTime: Date.now() - this.currentSession.startTime,
                iterationsCount: this.currentSession.iterations.length
            },
            progress: {
                currentStage: 'completed',
                completion: 100
            }
        };

        // Save to PostgreSQL
        await this.saveSessionToDatabase(completedSession);
        
        // Record in analytics
        analytics.recordSession(completedSession);
        
        // Clear current session
        this.currentSession = null;
        this.stopAutoSave();
        
        this.updateSessionUI();
        this.showCompletionNotification(completedSession);
        
        console.log(`✅ Session completed: ${completedSession.id}`);
        return completedSession;
    }

    /**
     * Pauzuje current session
     */
    pauseSession() {
        if (!this.currentSession || this.currentSession.status === 'paused') return;

        this.updateSession({
            status: 'paused',
            pausedAt: Date.now()
        });

        this.stopAutoSave();
        console.log(`⏸️ Session paused: ${this.currentSession.id}`);
    }

    /**
     * Wznawia paused session
     */
    resumeSession() {
        if (!this.currentSession) {
            console.warn('No session to resume');
            return;
        }

        const pausedTime = this.currentSession.pausedAt ? 
            Date.now() - this.currentSession.pausedAt : 0;

        this.updateSession({
            status: 'active',
            pausedAt: null,
            metrics: {
                ...this.currentSession.metrics,
                pausedTime: (this.currentSession.metrics.pausedTime || 0) + pausedTime
            }
        });

        this.startAutoSave();
        this.populateUIFromSession();
        console.log(`▶️ Session resumed: ${this.currentSession.id}`);
    }

    /**
     * Populuje UI z danych session
     */
    populateUIFromSession() {
        if (!this.currentSession) return;

        // Populate problem input
        const topicInput = document.getElementById('topic-input');
        if (topicInput) {
            topicInput.value = this.currentSession.problem;
        }

        // Update progress
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `Resumed: ${this.currentSession.progress.currentStage}`;
        }

        // Show iterations if any
        if (this.currentSession.iterations.length > 0) {
            // Import and call renderStorytellingTimeline
            import('./kitsune.js').then(module => {
                if (module.renderStorytellingTimeline) {
                    module.renderStorytellingTimeline(this.currentSession.iterations);
                }
            });
        }
    }

    /**
     * Odrzuca current session
     */
    async discardCurrentSession() {
        if (this.currentSession) {
            try {
                // Mark session as discarded in database
                await query(`
                    UPDATE sessions 
                    SET status = 'discarded', 
                        updated_at = NOW()
                    WHERE session_id = $1 AND user_id = $2
                `, [this.currentSession.id, this.currentUserId]);
                
                console.log(`🗑️ Discarded session: ${this.currentSession.id}`);
            } catch (error) {
                console.error('Failed to discard session in database:', error);
            }
            
            this.currentSession = null;
            this.stopAutoSave();
            this.updateSessionUI();
        }
    }

    /**
     * Zapisuje session do historii
     */
    async saveSessionToHistory(session) {
        this.sessionHistory.unshift(session);
        
        // Limit history size
        if (this.sessionHistory.length > this.maxSessions) {
            this.sessionHistory = this.sessionHistory.slice(0, this.maxSessions);
        }
        
        // Save to PostgreSQL database
        await this.saveSessionToDatabase(session);
    }

    /**
     * Zapisuje current session
     */
    async saveCurrentSession() {
        if (!this.currentSession) return;
        
        try {
            await this.saveSessionToDatabase(this.currentSession);
        } catch (error) {
            console.error('Failed to save current session:', error);
        }
    }

    /**
     * Ustawia auto-save
     */
    startAutoSave() {
        this.stopAutoSave(); // Clear existing interval
        
        this.autoSaveInterval = setInterval(() => {
            this.saveCurrentSession();
        }, 5000); // Save every 5 seconds
    }

    /**
     * Zatrzymuje auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Ustawia auto-recovery dla przypadków crash
     */
    setupAutoRecovery() {
        // Save session state before page unload
        window.addEventListener('beforeunload', () => {
            if (this.currentSession && !this.currentSession.completed) {
                this.saveCurrentSession();
            }
        });

        // Handle page visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveCurrentSession();
            }
        });
    }

    /**
     * Aktualizuje UI z informacjami o session
     */
    updateSessionUI() {
        const sessionInfo = this.createSessionInfoElement();
        
        // Remove existing session info
        const existing = document.getElementById('session-info');
        if (existing) {
            existing.remove();
        }

        // Add new session info
        if (sessionInfo) {
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(sessionInfo);
            }
        }
    }

    /**
     * Tworzy element z informacjami o session
     */
    createSessionInfoElement() {
        if (!this.currentSession) return null;

        const element = document.createElement('div');
        element.id = 'session-info';
        element.className = 'mt-4 p-3 bg-gray-800 rounded-lg text-sm';
        
        const timeElapsed = Math.round((Date.now() - this.currentSession.startTime) / 1000);
        const status = this.currentSession.status === 'paused' ? '⏸️ Paused' : '🟢 Active';
        
        element.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <span class="font-medium">Session:</span> 
                    <span class="text-blue-400">${this.currentSession.id.substring(0, 8)}</span>
                    <span class="mx-2">•</span>
                    <span>${status}</span>
                    <span class="mx-2">•</span>
                    <span>${timeElapsed}s elapsed</span>
                </div>
                <div class="flex gap-2">
                    ${this.currentSession.status === 'active' ? 
                        '<button id="pause-session" class="px-2 py-1 bg-yellow-600 rounded text-xs hover:bg-yellow-700">⏸️ Pause</button>' :
                        '<button id="resume-session-btn" class="px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700">▶️ Resume</button>'
                    }
                    <button id="save-session" class="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700">💾 Save</button>
                    <button id="end-session" class="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700">🏁 End</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.attachSessionControlListeners(element);
        
        return element;
    }

    /**
     * Dodaje event listenery do kontrolek session
     */
    attachSessionControlListeners(element) {
        element.querySelector('#pause-session')?.addEventListener('click', () => {
            this.pauseSession();
        });

        element.querySelector('#resume-session-btn')?.addEventListener('click', () => {
            this.resumeSession();
        });

        element.querySelector('#save-session')?.addEventListener('click', () => {
            this.saveCurrentSession();
            this.showSaveNotification();
        });

        element.querySelector('#end-session')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to end this session?')) {
                this.completeSession();
            }
        });
    }

    /**
     * Pokazuje powiadomienie o zapisaniu
     */
    showSaveNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg shadow-lg z-50';
        notification.innerHTML = '💾 Session saved successfully';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }

    /**
     * Pokazuje powiadomienie o ukończeniu
     */
    showCompletionNotification(session) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        
        const duration = Math.round(session.finalMetrics.totalTime / 1000);
        const quality = session.finalMetrics.avgQuality?.toFixed(1) || 'N/A';
        
        notification.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-2xl">🎉</span>
                <div>
                    <h4 class="font-semibold mb-1">Session Completed!</h4>
                    <p class="text-sm text-green-100">
                        Duration: ${duration}s<br>
                        Quality: ${quality}/10<br>
                        Iterations: ${session.finalMetrics.iterationsCount}
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Utility functions
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // Public API
    getCurrentSession() {
        return this.currentSession;
    }

    getSessionHistory() {
        return [...this.sessionHistory];
    }

    getSessionById(id) {
        return this.sessionHistory.find(session => session.id === id);
    }

    /**
     * Saves session data to PostgreSQL database
     */
    async saveSessionToDatabase(session) {
        try {
            // Upsert session data
            await query(`
                INSERT INTO sessions (
                    session_id, user_id, problem_statement, start_time, end_time,
                    status, progress_data, metadata, metrics, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                ON CONFLICT (session_id, user_id) 
                DO UPDATE SET
                    problem_statement = EXCLUDED.problem_statement,
                    end_time = EXCLUDED.end_time,
                    status = EXCLUDED.status,
                    progress_data = EXCLUDED.progress_data,
                    metadata = EXCLUDED.metadata,
                    metrics = EXCLUDED.metrics,
                    updated_at = NOW()
            `, [
                session.id,
                this.currentUserId,
                session.problem,
                new Date(session.startTime),
                session.endTime ? new Date(session.endTime) : null,
                session.status,
                JSON.stringify(session.progress),
                JSON.stringify(session.metadata),
                JSON.stringify(session.metrics)
            ]);

            // Save iterations
            if (session.iterations && session.iterations.length > 0) {
                for (const iteration of session.iterations) {
                    await query(`
                        INSERT INTO session_iterations (
                            session_id, iteration_number, session_time_ms, 
                            iteration_data, created_at
                        ) VALUES ((SELECT id FROM sessions WHERE session_id = $1 AND user_id = $2), $3, $4, $5, $6)
                        ON CONFLICT (session_id, iteration_number)
                        DO UPDATE SET
                            session_time_ms = EXCLUDED.session_time_ms,
                            iteration_data = EXCLUDED.iteration_data
                    `, [
                        session.id,
                        this.currentUserId,
                        iteration.number,
                        iteration.sessionTime || 0,
                        JSON.stringify(iteration.data || iteration),
                        new Date(iteration.timestamp)
                    ]);
                }
            }

            console.log(`💾 Session ${session.id} saved to PostgreSQL`);
        } catch (error) {
            console.error('Failed to save session to database:', error);
            throw error;
        }
    }

    async deleteSession(id) {
        this.sessionHistory = this.sessionHistory.filter(session => session.id !== id);
        
        // Delete from PostgreSQL database
        try {
            await query('DELETE FROM sessions WHERE session_id = $1 AND user_id = $2', [id, this.currentUserId]);
            console.log(`🗑️ Deleted session ${id} from database`);
        } catch (error) {
            console.error('Failed to delete session from database:', error);
        }
    }

    exportSessions() {
        const data = {
            sessions: this.sessionHistory,
            currentSession: this.currentSession,
            exportTimestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ies_sessions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export singleton instance
export const sessionManager = new SessionManager();
