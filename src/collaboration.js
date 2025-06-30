/**
 * Real-time Collaboration System
 * Enables multiple users to collaborate on problem-solving sessions in real-time
 */

export class CollaborationSystem {
    constructor() {
        this.sessionId = null;
        this.userId = this.generateUserId();
        this.userName = this.loadUserName();
        this.collaborators = new Map();
        this.comments = [];
        this.sharedCursor = null;
        this.isHost = false;
        this.connectionStatus = 'disconnected';
        
        this.initializeCollaborationUI();
        this.setupEventListeners();
    }

    /**
     * Tworzy UI dla collaboration
     */
    initializeCollaborationUI() {
        const collaborationHTML = `
            <div id="collaboration-hub" class="mt-6 bg-gray-800 p-6 rounded-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">🤝 Collaboration Hub</h2>
                    <div class="flex gap-2">
                        <span id="connection-status" class="px-2 py-1 bg-red-600 rounded text-xs">Offline</span>
                        <button id="start-collaboration" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm">
                            🌐 Start Collaboration
                        </button>
                        <button id="join-session" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                            🔗 Join Session
                        </button>
                    </div>
                </div>

                <!-- User Identity -->
                <div class="mb-4 p-3 bg-gray-900 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                            ${this.userName.charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1">
                            <input type="text" id="user-name-input" value="${this.userName}" 
                                   class="bg-transparent border-none text-white focus:outline-none" placeholder="Your name">
                        </div>
                        <div class="text-xs text-gray-400">ID: ${this.userId.substring(0, 8)}</div>
                    </div>
                </div>

                <!-- Active Collaborators -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">👥 Active Collaborators</h3>
                    <div id="collaborators-list" class="space-y-2">
                        <div class="text-gray-400 text-sm">No active collaborators</div>
                    </div>
                </div>

                <!-- Session Info -->
                <div id="session-info-collab" class="mb-6 hidden">
                    <h3 class="text-lg font-medium mb-3">📊 Session Info</h3>
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-400">Session ID:</span>
                                <div id="session-id-display" class="font-mono text-blue-400"></div>
                            </div>
                            <div>
                                <span class="text-gray-400">Role:</span>
                                <div id="user-role" class="font-medium"></div>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button id="copy-session-link" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                                📋 Copy Invite Link
                            </button>
                            <button id="leave-session" class="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm ml-2">
                                🚪 Leave Session
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Live Comments -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">💬 Live Comments</h3>
                    <div id="comments-container" class="bg-gray-900 rounded-lg max-h-64 overflow-y-auto">
                        <div id="comments-list" class="p-4 space-y-3">
                            <div class="text-gray-400 text-sm text-center">No comments yet</div>
                        </div>
                        <div class="border-t border-gray-700 p-3">
                            <div class="flex gap-2">
                                <input type="text" id="comment-input" placeholder="Add a comment..." 
                                       class="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm">
                                <button id="send-comment" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Activity Feed -->
                <div>
                    <h3 class="text-lg font-medium mb-3">📈 Live Activity</h3>
                    <div id="activity-feed" class="bg-gray-900 p-4 rounded-lg max-h-48 overflow-y-auto">
                        <div class="text-gray-400 text-sm">Activity feed will appear here...</div>
                    </div>
                </div>
            </div>
        `;

        // Insert after smart recommendations
        const recommendationsSection = document.getElementById('smart-recommendations');
        if (recommendationsSection) {
            recommendationsSection.insertAdjacentHTML('afterend', collaborationHTML);
        } else {
            // Insert before SSE log as fallback
            const sseLog = document.querySelector('#sse-log').parentElement;
            sseLog.insertAdjacentHTML('beforebegin', collaborationHTML);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start collaboration
        document.getElementById('start-collaboration')?.addEventListener('click', () => {
            this.startCollaboration();
        });

        // Join session
        document.getElementById('join-session')?.addEventListener('click', () => {
            this.showJoinModal();
        });

        // User name change
        document.getElementById('user-name-input')?.addEventListener('change', (e) => {
            this.updateUserName(e.target.value);
        });

        // Send comment
        document.getElementById('send-comment')?.addEventListener('click', () => {
            this.sendComment();
        });

        // Comment input enter key
        document.getElementById('comment-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendComment();
            }
        });

        // Copy session link
        document.getElementById('copy-session-link')?.addEventListener('click', () => {
            this.copySessionLink();
        });

        // Leave session
        document.getElementById('leave-session')?.addEventListener('click', () => {
            this.leaveSession();
        });
    }

    /**
     * Starts a new collaboration session
     */
    startCollaboration() {
        this.sessionId = this.generateSessionId();
        this.isHost = true;
        this.connectionStatus = 'connected';
        
        this.updateUI();
        this.addActivity(`🚀 ${this.userName} started a collaboration session`, 'system');
        
        // Simulate WebSocket connection
        this.simulateRealtimeConnection();
        
        this.showNotification('Collaboration session started! Share the link with your team.', 'success');
        
        // Show session info
        document.getElementById('session-info-collab').classList.remove('hidden');
        document.getElementById('session-id-display').textContent = this.sessionId;
        document.getElementById('user-role').textContent = 'Host';
    }

    /**
     * Shows join session modal
     */
    showJoinModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-md w-full text-white m-4">
                <h3 class="text-xl font-semibold mb-4">🔗 Join Collaboration Session</h3>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Session ID or Link:</label>
                    <input type="text" id="join-session-id" placeholder="Enter session ID or paste invite link" 
                           class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Your Name:</label>
                    <input type="text" id="join-user-name" value="${this.userName}" 
                           class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                </div>
                
                <div class="text-xs text-gray-400 mb-4">
                    💡 Tip: You can also join by clicking an invite link shared by the host
                </div>
                
                <div class="flex gap-3 justify-end">
                    <button id="cancel-join" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">
                        Cancel
                    </button>
                    <button id="confirm-join" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                        Join Session
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#cancel-join').addEventListener('click', () => modal.remove());
        modal.querySelector('#confirm-join').addEventListener('click', () => {
            const sessionId = modal.querySelector('#join-session-id').value.trim();
            const userName = modal.querySelector('#join-user-name').value.trim();
            
            if (sessionId && userName) {
                this.joinSession(sessionId, userName);
                modal.remove();
            }
        });
    }

    /**
     * Joins an existing session
     */
    joinSession(sessionId, userName) {
        this.sessionId = sessionId;
        this.userName = userName;
        this.isHost = false;
        this.connectionStatus = 'connected';
        
        this.updateUI();
        this.addActivity(`👋 ${this.userName} joined the session`, 'join');
        
        // Simulate joining
        this.simulateRealtimeConnection();
        this.addCollaborator({
            id: 'host',
            name: 'Session Host',
            role: 'host',
            joinedAt: Date.now() - 120000,
            isActive: true
        });
        
        this.showNotification(`Joined session: ${sessionId}`, 'success');
        
        // Show session info
        document.getElementById('session-info-collab').classList.remove('hidden');
        document.getElementById('session-id-display').textContent = this.sessionId;
        document.getElementById('user-role').textContent = 'Participant';
    }

    /**
     * Simulates real-time connection with periodic updates
     */
    simulateRealtimeConnection() {
        // Simulate random collaborator activities
        setInterval(() => {
            if (this.connectionStatus === 'connected' && Math.random() < 0.3) {
                this.simulateCollaboratorActivity();
            }
        }, 8000);

        // Simulate occasional new collaborators
        setTimeout(() => {
            if (this.connectionStatus === 'connected') {
                this.addCollaborator({
                    id: `user_${Date.now()}`,
                    name: `Collaborator ${Math.floor(Math.random() * 100)}`,
                    role: 'participant',
                    joinedAt: Date.now(),
                    isActive: true
                });
            }
        }, 15000);
    }

    /**
     * Simulates collaborator activity
     */
    simulateCollaboratorActivity() {
        const activities = [
            'is viewing the problem statement',
            'started analyzing iteration 2',
            'added insights to the consensus',
            'is reviewing the final solution',
            'suggested an alternative approach'
        ];
        
        const collaboratorNames = Array.from(this.collaborators.values()).map(c => c.name);
        if (collaboratorNames.length > 0) {
            const randomName = collaboratorNames[Math.floor(Math.random() * collaboratorNames.length)];
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            
            this.addActivity(`👤 ${randomName} ${randomActivity}`, 'activity');
        }
    }

    /**
     * Adds a collaborator to the session
     */
    addCollaborator(collaborator) {
        this.collaborators.set(collaborator.id, collaborator);
        this.updateCollaboratorsList();
        this.addActivity(`👋 ${collaborator.name} joined the session`, 'join');
    }

    /**
     * Updates the collaborators list UI
     */
    updateCollaboratorsList() {
        const container = document.getElementById('collaborators-list');
        if (!container) return;

        if (this.collaborators.size === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm">No active collaborators</div>';
            return;
        }

        const collaboratorsHTML = Array.from(this.collaborators.values()).map(collaborator => {
            const timeAgo = this.getTimeAgo(collaborator.joinedAt);
            const statusColor = collaborator.isActive ? 'green' : 'gray';
            
            return `
                <div class="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
                    <div class="relative">
                        <div class="w-8 h-8 bg-${collaborator.role === 'host' ? 'yellow' : 'blue'}-500 rounded-full flex items-center justify-center text-sm font-bold">
                            ${collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-${statusColor}-500 rounded-full border-2 border-gray-800"></div>
                    </div>
                    <div class="flex-1">
                        <div class="font-medium">${collaborator.name}</div>
                        <div class="text-xs text-gray-400">
                            ${collaborator.role} • joined ${timeAgo}
                        </div>
                    </div>
                    <div class="text-xs text-gray-400">
                        ${collaborator.isActive ? '🟢 Active' : '⭕ Away'}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = collaboratorsHTML;
    }

    /**
     * Sends a comment
     */
    sendComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();
        
        if (!content) return;

        const comment = {
            id: Date.now(),
            userId: this.userId,
            userName: this.userName,
            content,
            timestamp: Date.now(),
            type: 'user'
        };

        this.comments.push(comment);
        this.updateComments();
        
        input.value = '';
        
        // Simulate comment broadcast
        this.addActivity(`💬 ${this.userName} added a comment`, 'comment');
    }

    /**
     * Updates comments UI
     */
    updateComments() {
        const container = document.getElementById('comments-list');
        if (!container) return;

        if (this.comments.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm text-center">No comments yet</div>';
            return;
        }

        const commentsHTML = this.comments.slice(-10).map(comment => {
            const timeAgo = this.getTimeAgo(comment.timestamp);
            const isOwnComment = comment.userId === this.userId;
            
            return `
                <div class="flex gap-3 ${isOwnComment ? 'flex-row-reverse' : ''}">
                    <div class="w-6 h-6 bg-${isOwnComment ? 'blue' : 'green'}-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        ${comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 ${isOwnComment ? 'text-right' : ''}">
                        <div class="bg-${isOwnComment ? 'blue' : 'gray'}-600 p-3 rounded-lg inline-block max-w-xs">
                            <div class="text-sm">${comment.content}</div>
                        </div>
                        <div class="text-xs text-gray-400 mt-1">
                            ${comment.userName} • ${timeAgo}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = commentsHTML;
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Adds activity to the feed
     */
    addActivity(message, type = 'info') {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        const activity = document.createElement('div');
        activity.className = 'flex items-center gap-2 text-sm py-1 border-b border-gray-700 last:border-b-0';
        
        const icons = {
            system: '🚀',
            join: '👋',
            leave: '👋',
            comment: '💬',
            activity: '👤',
            info: 'ℹ️'
        };

        activity.innerHTML = `
            <span class="text-gray-400">${new Date().toLocaleTimeString()}</span>
            <span>${icons[type] || icons.info}</span>
            <span class="text-gray-300">${message}</span>
        `;

        // Remove old activities (keep last 20)
        while (container.children.length >= 20) {
            container.removeChild(container.firstChild);
        }

        container.appendChild(activity);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Copies session invite link
     */
    copySessionLink() {
        const link = `${window.location.origin}${window.location.pathname}?join=${this.sessionId}`;
        
        navigator.clipboard.writeText(link).then(() => {
            this.showNotification('Invite link copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Invite link copied to clipboard!', 'success');
        });
    }

    /**
     * Leaves the current session
     */
    leaveSession() {
        this.addActivity(`👋 ${this.userName} left the session`, 'leave');
        
        this.sessionId = null;
        this.isHost = false;
        this.connectionStatus = 'disconnected';
        this.collaborators.clear();
        this.comments = [];
        
        this.updateUI();
        document.getElementById('session-info-collab').classList.add('hidden');
        
        this.showNotification('Left collaboration session', 'info');
    }

    /**
     * Updates UI based on current state
     */
    updateUI() {
        const statusElement = document.getElementById('connection-status');
        const startButton = document.getElementById('start-collaboration');
        const joinButton = document.getElementById('join-session');

        if (this.connectionStatus === 'connected') {
            statusElement.textContent = 'Connected';
            statusElement.className = 'px-2 py-1 bg-green-600 rounded text-xs';
            startButton.style.display = 'none';
            joinButton.style.display = 'none';
        } else {
            statusElement.textContent = 'Offline';
            statusElement.className = 'px-2 py-1 bg-red-600 rounded text-xs';
            startButton.style.display = 'inline-block';
            joinButton.style.display = 'inline-block';
        }

        this.updateCollaboratorsList();
        this.updateComments();
    }

    /**
     * Updates user name
     */
    updateUserName(newName) {
        if (newName.trim()) {
            this.userName = newName.trim();
            localStorage.setItem('ies_user_name', this.userName);
            
            if (this.connectionStatus === 'connected') {
                this.addActivity(`📝 User renamed to ${this.userName}`, 'info');
            }
        }
    }

    // Utility functions
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    loadUserName() {
        return localStorage.getItem('ies_user_name') || `User${Math.floor(Math.random() * 1000)}`;
    }

    getTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }

    showNotification(message, type = 'info') {
        const colors = { success: 'green', error: 'red', info: 'blue' };
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 bg-${colors[type]}-600 text-white p-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Public API
    getCurrentSession() {
        return {
            sessionId: this.sessionId,
            isHost: this.isHost,
            collaborators: Array.from(this.collaborators.values()),
            commentsCount: this.comments.length,
            connectionStatus: this.connectionStatus
        };
    }

    broadcastProblemUpdate(problem) {
        if (this.connectionStatus === 'connected') {
            this.addActivity(`📝 Problem updated: "${problem.substring(0, 50)}..."`, 'activity');
        }
    }

    broadcastSolutionProgress(progress) {
        if (this.connectionStatus === 'connected') {
            this.addActivity(`⚡ Solution progress: ${progress.stage} (${Math.round(progress.progress)}%)`, 'activity');
        }
    }
}

// Export singleton instance
export const collaborationSystem = new CollaborationSystem();
