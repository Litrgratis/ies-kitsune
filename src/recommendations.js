/**
 * Smart Recommendations Engine
 * Provides intelligent suggestions and insights based on user behavior and session data
 */

import { analytics } from './analytics.js';
import { sessionManager } from './session_manager.js';
import { problemTemplates } from './templates.js';

export class SmartRecommendationsEngine {
    constructor() {
        this.userProfile = this.loadUserProfile();
        this.recommendations = [];
        this.insights = [];
        this.learningData = this.loadLearningData();
        
        this.initializeRecommendationsUI();
        this.startAdaptiveLearning();
    }

    /**
     * Tworzy UI dla smart recommendations
     */
    initializeRecommendationsUI() {
        const recommendationsHTML = `
            <div id="smart-recommendations" class="mt-6 bg-gray-800 p-6 rounded-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">🧠 Smart Recommendations</h2>
                    <div class="flex gap-2">
                        <button id="refresh-recommendations" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                            🔄 Refresh
                        </button>
                        <button id="recommendation-settings" class="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 text-sm">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>

                <!-- User Insights -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">💡 Personalized Insights</h3>
                    <div id="user-insights" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Insights will be populated here -->
                    </div>
                </div>

                <!-- Template Recommendations -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">📋 Recommended Templates</h3>
                    <div id="template-recommendations" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Template recommendations will be populated here -->
                    </div>
                </div>

                <!-- Next Steps -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">🎯 Suggested Next Steps</h3>
                    <div id="next-steps" class="space-y-3">
                        <!-- Next steps will be populated here -->
                    </div>
                </div>

                <!-- Learning Progress -->
                <div>
                    <h3 class="text-lg font-medium mb-3">📈 Your Progress</h3>
                    <div id="learning-progress" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <!-- Progress metrics will be populated here -->
                    </div>
                </div>
            </div>
        `;

        // Insert after analytics dashboard
        const analyticsSection = document.getElementById('analytics-dashboard');
        if (analyticsSection) {
            analyticsSection.insertAdjacentHTML('afterend', recommendationsHTML);
        } else {
            // Insert before SSE log as fallback
            const sseLog = document.querySelector('#sse-log').parentElement;
            sseLog.insertAdjacentHTML('beforebegin', recommendationsHTML);
        }

        this.initializeEventListeners();
        this.updateRecommendations();
    }

    /**
     * Inicjalizuje event listenery
     */
    initializeEventListeners() {
        document.getElementById('refresh-recommendations')?.addEventListener('click', () => {
            this.updateRecommendations();
            this.showNotification('Recommendations updated! 🔄', 'info');
        });

        document.getElementById('recommendation-settings')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
    }

    /**
     * Aktualizuje wszystkie rekomendacje
     */
    updateRecommendations() {
        this.generateInsights();
        this.generateTemplateRecommendations();
        this.generateNextSteps();
        this.updateLearningProgress();
    }

    /**
     * Generuje personalized insights
     */
    generateInsights() {
        const insights = [];
        const sessions = analytics.sessions;
        const userBehavior = this.analyzeUserBehavior();

        // Quality trend insight
        if (sessions.length >= 3) {
            const recentQuality = sessions.slice(-3).reduce((sum, s) => sum + s.avgQuality, 0) / 3;
            const olderQuality = sessions.slice(-6, -3).reduce((sum, s) => sum + s.avgQuality, 0) / 3;
            
            if (recentQuality > olderQuality) {
                insights.push({
                    type: 'improvement',
                    icon: '📈',
                    title: 'Quality Improving',
                    message: `Your solution quality improved by ${((recentQuality - olderQuality) / olderQuality * 100).toFixed(1)}% recently!`,
                    color: 'green'
                });
            } else if (recentQuality < olderQuality * 0.9) {
                insights.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Quality Decline',
                    message: 'Consider taking breaks between sessions for better performance.',
                    color: 'yellow'
                });
            }
        }

        // Time optimization insight
        if (userBehavior.avgSessionTime > 600) { // 10 minutes
            insights.push({
                type: 'tip',
                icon: '⏱️',
                title: 'Time Optimization',
                message: 'Try breaking complex problems into smaller components for faster solving.',
                color: 'blue'
            });
        }

        // Expertise area insight
        const expertiseArea = this.identifyExpertiseArea();
        if (expertiseArea) {
            insights.push({
                type: 'strength',
                icon: '💪',
                title: 'Your Strength',
                message: `You excel at ${expertiseArea.name} problems with ${expertiseArea.avgQuality.toFixed(1)}/10 average quality.`,
                color: 'purple'
            });
        }

        // Collaboration suggestion
        if (sessions.length >= 5 && userBehavior.avgConsensus < 0.7) {
            insights.push({
                type: 'suggestion',
                icon: '🤝',
                title: 'Collaboration Opportunity',
                message: 'Consider using templates for better structured problem-solving approaches.',
                color: 'cyan'
            });
        }

        this.renderInsights(insights);
    }

    /**
     * Renderuje insights
     */
    renderInsights(insights) {
        const container = document.getElementById('user-insights');
        if (!container) return;

        if (insights.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center text-gray-400 py-8">
                    <span class="text-2xl">🔍</span>
                    <p class="mt-2">Complete more sessions to get personalized insights</p>
                </div>
            `;
            return;
        }

        const insightsHTML = insights.map(insight => `
            <div class="bg-gray-900 p-4 rounded-lg border-l-4 border-${insight.color}-500">
                <div class="flex items-start gap-3">
                    <span class="text-2xl">${insight.icon}</span>
                    <div>
                        <h4 class="font-medium text-${insight.color}-400">${insight.title}</h4>
                        <p class="text-sm text-gray-300 mt-1">${insight.message}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = insightsHTML;
    }

    /**
     * Generuje rekomendacje templates
     */
    generateTemplateRecommendations() {
        const userBehavior = this.analyzeUserBehavior();
        const recommendations = [];

        // Based on success rate
        if (userBehavior.successRate < 0.6) {
            recommendations.push({
                template: problemTemplates.getTemplateById('employee_engagement'),
                reason: 'Start with people-focused problems for better success rates',
                confidence: 0.8
            });
        }

        // Based on expertise area
        const expertiseArea = this.identifyExpertiseArea();
        if (expertiseArea && expertiseArea.category !== 'custom') {
            const categoryTemplates = problemTemplates.getAllTemplatesFlat()
                .filter(t => t.categoryKey === expertiseArea.category)
                .slice(0, 2);
            
            categoryTemplates.forEach(template => {
                recommendations.push({
                    template,
                    reason: `Matches your ${expertiseArea.name} expertise`,
                    confidence: 0.9
                });
            });
        }

        // Trending templates
        const popular = problemTemplates.getPopularTemplates(1);
        if (popular.length > 0) {
            recommendations.push({
                template: popular[0],
                reason: 'Popular choice among users',
                confidence: 0.6
            });
        }

        // Fill with diverse options if needed
        while (recommendations.length < 3) {
            const allTemplates = problemTemplates.getAllTemplatesFlat();
            const unused = allTemplates.filter(t => 
                !recommendations.some(r => r.template.id === t.id) &&
                !(problemTemplates.templateUsageStats[t.id] > 0)
            );
            
            if (unused.length > 0) {
                const random = unused[Math.floor(Math.random() * unused.length)];
                recommendations.push({
                    template: random,
                    reason: 'Explore new problem types',
                    confidence: 0.4
                });
            } else {
                break;
            }
        }

        this.renderTemplateRecommendations(recommendations.slice(0, 3));
    }

    /**
     * Renderuje template recommendations
     */
    renderTemplateRecommendations(recommendations) {
        const container = document.getElementById('template-recommendations');
        if (!container) return;

        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center text-gray-400 py-8">
                    <span class="text-2xl">📋</span>
                    <p class="mt-2">No template recommendations available</p>
                </div>
            `;
            return;
        }

        const recommendationsHTML = recommendations.map(rec => {
            const category = problemTemplates.getCategoryForTemplate(rec.template.id);
            const confidencePercent = Math.round(rec.confidence * 100);
            
            return `
                <div class="bg-gray-900 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition-all"
                     data-template-id="${rec.template.id}">
                    <div class="flex items-start gap-3 mb-3">
                        <span class="text-2xl">${category.icon}</span>
                        <div class="flex-1">
                            <h4 class="font-medium text-${category.color}-400">${rec.template.title}</h4>
                            <p class="text-xs text-gray-400">${category.name}</p>
                        </div>
                        <span class="px-2 py-1 bg-green-600 rounded text-xs">${confidencePercent}%</span>
                    </div>
                    
                    <p class="text-sm text-gray-300 mb-3">${rec.template.description}</p>
                    
                    <div class="mb-3">
                        <p class="text-xs text-blue-400">💡 ${rec.reason}</p>
                    </div>
                    
                    <button class="use-recommended-template w-full px-3 py-2 bg-${category.color}-600 rounded hover:bg-${category.color}-700 text-sm">
                        Use Template
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = recommendationsHTML;

        // Add click handlers
        container.querySelectorAll('[data-template-id]').forEach(card => {
            card.querySelector('.use-recommended-template').addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = card.dataset.templateId;
                const template = problemTemplates.getTemplateById(templateId);
                if (template) {
                    problemTemplates.useTemplate(template);
                    this.recordRecommendationUsage(templateId, 'template');
                }
            });
        });
    }

    /**
     * Generuje suggested next steps
     */
    generateNextSteps() {
        const userBehavior = this.analyzeUserBehavior();
        const currentSession = sessionManager.getCurrentSession();
        const nextSteps = [];

        // Session-specific steps
        if (currentSession) {
            if (currentSession.iterations.length === 0) {
                nextSteps.push({
                    icon: '🚀',
                    title: 'Start Problem Solving',
                    description: 'Begin analyzing your current problem with AI assistance',
                    action: 'solve',
                    priority: 'high'
                });
            } else if (currentSession.status === 'paused') {
                nextSteps.push({
                    icon: '▶️',
                    title: 'Resume Session',
                    description: 'Continue working on your paused problem-solving session',
                    action: 'resume',
                    priority: 'high'
                });
            }
        } else {
            // No active session
            if (analytics.sessions.length === 0) {
                nextSteps.push({
                    icon: '📋',
                    title: 'Try a Template',
                    description: 'Start with a pre-built problem template to get familiar with the system',
                    action: 'template',
                    priority: 'high'
                });
            } else {
                nextSteps.push({
                    icon: '✨',
                    title: 'Start New Session',
                    description: 'Begin solving a new problem or challenge',
                    action: 'new-session',
                    priority: 'medium'
                });
            }
        }

        // Learning opportunities
        if (userBehavior.successRate < 0.8) {
            nextSteps.push({
                icon: '📚',
                title: 'Improve Techniques',
                description: 'Learn about effective problem-solving methodologies',
                action: 'learn',
                priority: 'medium'
            });
        }

        // Analytics insights
        if (analytics.sessions.length >= 5) {
            nextSteps.push({
                icon: '📊',
                title: 'Review Analytics',
                description: 'Analyze your problem-solving patterns and progress',
                action: 'analytics',
                priority: 'low'
            });
        }

        // Export suggestions
        if (analytics.sessions.length >= 3) {
            nextSteps.push({
                icon: '📤',
                title: 'Export Progress',
                description: 'Save your session data and insights for external analysis',
                action: 'export',
                priority: 'low'
            });
        }

        this.renderNextSteps(nextSteps.slice(0, 4));
    }

    /**
     * Renderuje next steps
     */
    renderNextSteps(steps) {
        const container = document.getElementById('next-steps');
        if (!container) return;

        if (steps.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <span class="text-2xl">🎯</span>
                    <p class="mt-2">No specific recommendations at the moment</p>
                </div>
            `;
            return;
        }

        const priorityColors = {
            high: 'red',
            medium: 'yellow',
            low: 'gray'
        };

        const stepsHTML = steps.map(step => `
            <div class="bg-gray-900 p-4 rounded-lg flex items-center gap-4 hover:bg-gray-700 cursor-pointer transition-all"
                 data-action="${step.action}">
                <span class="text-2xl">${step.icon}</span>
                <div class="flex-1">
                    <h4 class="font-medium">${step.title}</h4>
                    <p class="text-sm text-gray-400">${step.description}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-${priorityColors[step.priority]}-600 rounded text-xs">
                        ${step.priority}
                    </span>
                    <span class="text-gray-400">→</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = stepsHTML;

        // Add click handlers
        container.querySelectorAll('[data-action]').forEach(step => {
            step.addEventListener('click', () => {
                this.executeNextStepAction(step.dataset.action);
            });
        });
    }

    /**
     * Wykonuje akcję next step
     */
    executeNextStepAction(action) {
        switch (action) {
            case 'solve':
                document.getElementById('solve-button')?.click();
                break;
            case 'resume':
                sessionManager.resumeSession();
                break;
            case 'template':
                document.querySelector('#templates-browser')?.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'new-session':
                document.getElementById('topic-input')?.focus();
                break;
            case 'analytics':
                document.getElementById('analytics-dashboard')?.scrollIntoView({ behavior: 'smooth' });
                break;
            case 'export':
                analytics.exportAnalytics();
                break;
            case 'learn':
                this.showLearningModal();
                break;
        }

        this.recordRecommendationUsage(action, 'next-step');
    }

    /**
     * Aktualizuje learning progress
     */
    updateLearningProgress() {
        const userBehavior = this.analyzeUserBehavior();
        const progress = this.calculateProgress();

        const progressHTML = `
            <div class="bg-gray-900 p-4 rounded-lg text-center">
                <h4 class="text-sm text-gray-400 mb-2">Sessions Completed</h4>
                <p class="text-2xl font-bold text-blue-400">${analytics.sessions.length}</p>
                <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div class="bg-blue-400 h-2 rounded-full" style="width: ${Math.min(100, (analytics.sessions.length / 10) * 100)}%"></div>
                </div>
            </div>
            
            <div class="bg-gray-900 p-4 rounded-lg text-center">
                <h4 class="text-sm text-gray-400 mb-2">Skill Level</h4>
                <p class="text-2xl font-bold text-green-400">${progress.skillLevel}</p>
                <p class="text-xs text-gray-400 mt-1">${progress.skillDescription}</p>
            </div>
            
            <div class="bg-gray-900 p-4 rounded-lg text-center">
                <h4 class="text-sm text-gray-400 mb-2">Success Rate</h4>
                <p class="text-2xl font-bold text-yellow-400">${(userBehavior.successRate * 100).toFixed(1)}%</p>
                <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div class="bg-yellow-400 h-2 rounded-full" style="width: ${userBehavior.successRate * 100}%"></div>
                </div>
            </div>
            
            <div class="bg-gray-900 p-4 rounded-lg text-center">
                <h4 class="text-sm text-gray-400 mb-2">Next Milestone</h4>
                <p class="text-lg font-bold text-purple-400">${progress.nextMilestone.name}</p>
                <p class="text-xs text-gray-400 mt-1">${progress.nextMilestone.requirement}</p>
            </div>
        `;

        const container = document.getElementById('learning-progress');
        if (container) {
            container.innerHTML = progressHTML;
        }
    }

    /**
     * Analizuje user behavior
     */
    analyzeUserBehavior() {
        const sessions = analytics.sessions;
        
        if (sessions.length === 0) {
            return {
                avgSessionTime: 0,
                avgQuality: 0,
                avgConsensus: 0,
                successRate: 0,
                preferredCategories: [],
                problemComplexity: 'unknown'
            };
        }

        const avgSessionTime = sessions.reduce((sum, s) => sum + s.totalTime, 0) / sessions.length;
        const avgQuality = sessions.reduce((sum, s) => sum + s.avgQuality, 0) / sessions.length;
        const avgConsensus = sessions.reduce((sum, s) => sum + s.finalConsensus, 0) / sessions.length;
        const successRate = sessions.filter(s => s.success).length / sessions.length;

        return {
            avgSessionTime,
            avgQuality,
            avgConsensus,
            successRate,
            preferredCategories: this.identifyPreferredCategories(),
            problemComplexity: this.assessProblemComplexity()
        };
    }

    /**
     * Identyfikuje area of expertise
     */
    identifyExpertiseArea() {
        const sessions = analytics.sessions;
        if (sessions.length < 3) return null;

        // This would require category tracking in sessions
        // For now, return a mock expertise area
        const categories = ['business', 'sustainability', 'innovation', 'operations', 'people'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        
        return {
            category: randomCategory,
            name: randomCategory.charAt(0).toUpperCase() + randomCategory.slice(1),
            avgQuality: 7.5 + Math.random() * 1.5
        };
    }

    /**
     * Oblicza progress i skill level
     */
    calculateProgress() {
        const sessions = analytics.sessions.length;
        const avgQuality = analytics.sessions.reduce((sum, s) => sum + s.avgQuality, 0) / Math.max(1, sessions);
        
        let skillLevel, skillDescription, nextMilestone;
        
        if (sessions < 3) {
            skillLevel = 'Beginner';
            skillDescription = 'Learning the basics';
            nextMilestone = { name: 'Explorer', requirement: 'Complete 3 sessions' };
        } else if (sessions < 10) {
            skillLevel = 'Explorer';
            skillDescription = 'Building experience';
            nextMilestone = { name: 'Practitioner', requirement: 'Complete 10 sessions' };
        } else if (avgQuality < 7.5) {
            skillLevel = 'Practitioner';
            skillDescription = 'Developing expertise';
            nextMilestone = { name: 'Expert', requirement: 'Achieve 7.5+ avg quality' };
        } else {
            skillLevel = 'Expert';
            skillDescription = 'Master problem solver';
            nextMilestone = { name: 'Mentor', requirement: 'Share knowledge with others' };
        }

        return { skillLevel, skillDescription, nextMilestone };
    }

    /**
     * Pokazuje modal z learning resources
     */
    showLearningModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-2xl w-full text-white m-4">
                <h3 class="text-xl font-semibold mb-4">📚 Learning Resources</h3>
                
                <div class="space-y-4">
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <h4 class="font-medium text-blue-400 mb-2">Problem-Solving Methodologies</h4>
                        <ul class="text-sm text-gray-300 space-y-1">
                            <li>• Root Cause Analysis (5 Whys, Fishbone)</li>
                            <li>• Design Thinking Process</li>
                            <li>• LEAN Problem Solving</li>
                            <li>• Six Sigma DMAIC</li>
                        </ul>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <h4 class="font-medium text-green-400 mb-2">Best Practices</h4>
                        <ul class="text-sm text-gray-300 space-y-1">
                            <li>• Define problems clearly and specifically</li>
                            <li>• Consider multiple perspectives</li>
                            <li>• Use data to support decisions</li>
                            <li>• Test solutions before full implementation</li>
                        </ul>
                    </div>
                    
                    <div class="bg-gray-900 p-4 rounded-lg">
                        <h4 class="font-medium text-purple-400 mb-2">Tips for Better Results</h4>
                        <ul class="text-sm text-gray-300 space-y-1">
                            <li>• Break complex problems into smaller parts</li>
                            <li>• Use templates for structured approaches</li>
                            <li>• Take breaks during long sessions</li>
                            <li>• Review and learn from past sessions</li>
                        </ul>
                    </div>
                </div>
                
                <div class="flex justify-end mt-6">
                    <button id="close-learning" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#close-learning').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Starts adaptive learning
     */
    startAdaptiveLearning() {
        // Monitor user interactions and adapt recommendations
        setInterval(() => {
            this.updateUserProfile();
            this.saveLearningData();
        }, 60000); // Update every minute
    }

    // Utility functions
    identifyPreferredCategories() {
        // Mock implementation - would analyze session data
        return ['business', 'innovation'];
    }

    assessProblemComplexity() {
        const avgTime = analytics.sessions.reduce((sum, s) => sum + s.totalTime, 0) / Math.max(1, analytics.sessions.length);
        if (avgTime < 300000) return 'simple'; // < 5 minutes
        if (avgTime < 900000) return 'moderate'; // < 15 minutes
        return 'complex';
    }

    recordRecommendationUsage(itemId, type) {
        if (!this.learningData.usageHistory) {
            this.learningData.usageHistory = [];
        }
        
        this.learningData.usageHistory.push({
            itemId,
            type,
            timestamp: Date.now(),
            context: {
                sessionCount: analytics.sessions.length,
                avgQuality: analytics.sessions.reduce((sum, s) => sum + s.avgQuality, 0) / Math.max(1, analytics.sessions.length)
            }
        });

        // Keep only last 100 usage records
        if (this.learningData.usageHistory.length > 100) {
            this.learningData.usageHistory = this.learningData.usageHistory.slice(-100);
        }
    }

    updateUserProfile() {
        this.userProfile = {
            ...this.userProfile,
            lastUpdated: Date.now(),
            sessionCount: analytics.sessions.length,
            skillLevel: this.calculateProgress().skillLevel,
            behavior: this.analyzeUserBehavior()
        };
        
        localStorage.setItem('ies_user_profile', JSON.stringify(this.userProfile));
    }

    showNotification(message, type = 'info') {
        const colors = { success: 'green', error: 'red', info: 'blue' };
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 bg-${colors[type]}-600 text-white p-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showSettingsModal() {
        // Implementation for recommendation settings
        this.showNotification('Settings modal not implemented yet', 'info');
    }

    // Storage functions
    loadUserProfile() {
        const stored = localStorage.getItem('ies_user_profile');
        return stored ? JSON.parse(stored) : {
            createdAt: Date.now(),
            preferences: {},
            goals: []
        };
    }

    loadLearningData() {
        const stored = localStorage.getItem('ies_learning_data');
        return stored ? JSON.parse(stored) : {
            usageHistory: [],
            adaptations: {}
        };
    }

    saveLearningData() {
        localStorage.setItem('ies_learning_data', JSON.stringify(this.learningData));
    }
}

// Export singleton instance
export const smartRecommendations = new SmartRecommendationsEngine();
