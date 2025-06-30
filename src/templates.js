/**
 * Problem Templates System
 * Provides pre-built problem scenarios and intelligent template matching
 */

export class ProblemTemplatesSystem {
    constructor() {
        this.templates = this.initializeTemplates();
        this.userTemplates = this.loadUserTemplates();
        this.templateUsageStats = this.loadUsageStats();
    }

    /**
     * Inicjalizuje pre-built templates
     */
    initializeTemplates() {
        return {
            business: {
                name: 'Business Strategy',
                icon: '💼',
                color: 'blue',
                templates: [
                    {
                        id: 'market_expansion',
                        title: 'Market Expansion Strategy',
                        description: 'Plan for entering new markets or expanding existing ones',
                        problem: 'Develop a comprehensive strategy to expand our business into new markets while maintaining current market share and profitability.',
                        tags: ['strategy', 'growth', 'markets'],
                        difficulty: 'medium',
                        estimatedTime: '15-25 minutes',
                        expectedOutcomes: ['Market analysis', 'Entry strategy', 'Risk assessment', 'Timeline'],
                        industry: ['technology', 'retail', 'services']
                    },
                    {
                        id: 'cost_optimization',
                        title: 'Cost Optimization Initiative',
                        description: 'Reduce operational costs without impacting quality',
                        problem: 'Identify and implement cost reduction opportunities across all departments while maintaining service quality and employee satisfaction.',
                        tags: ['efficiency', 'costs', 'optimization'],
                        difficulty: 'medium',
                        estimatedTime: '20-30 minutes',
                        expectedOutcomes: ['Cost analysis', 'Reduction strategies', 'Implementation plan'],
                        industry: ['manufacturing', 'services', 'healthcare']
                    },
                    {
                        id: 'digital_transformation',
                        title: 'Digital Transformation Roadmap',
                        description: 'Plan digital transformation initiatives',
                        problem: 'Create a comprehensive digital transformation strategy that modernizes our operations, improves customer experience, and positions us for future growth.',
                        tags: ['technology', 'transformation', 'innovation'],
                        difficulty: 'high',
                        estimatedTime: '30-45 minutes',
                        expectedOutcomes: ['Technology assessment', 'Transformation roadmap', 'Change management'],
                        industry: ['all']
                    }
                ]
            },
            sustainability: {
                name: 'Sustainability & Environment',
                icon: '🌱',
                color: 'green',
                templates: [
                    {
                        id: 'carbon_reduction',
                        title: 'Carbon Footprint Reduction',
                        description: 'Develop strategies to reduce environmental impact',
                        problem: 'Reduce our organization\'s carbon footprint by 50% within 5 years while maintaining operational efficiency and business growth.',
                        tags: ['environment', 'sustainability', 'carbon'],
                        difficulty: 'high',
                        estimatedTime: '25-35 minutes',
                        expectedOutcomes: ['Emissions assessment', 'Reduction strategies', 'Implementation timeline'],
                        industry: ['manufacturing', 'energy', 'transportation']
                    },
                    {
                        id: 'circular_economy',
                        title: 'Circular Economy Implementation',
                        description: 'Transition to circular business model',
                        problem: 'Design and implement a circular economy model that minimizes waste, maximizes resource efficiency, and creates new revenue streams.',
                        tags: ['circular', 'waste', 'efficiency'],
                        difficulty: 'high',
                        estimatedTime: '30-40 minutes',
                        expectedOutcomes: ['Business model redesign', 'Waste reduction plan', 'New revenue streams'],
                        industry: ['manufacturing', 'retail', 'technology']
                    }
                ]
            },
            innovation: {
                name: 'Innovation & R&D',
                icon: '🔬',
                color: 'purple',
                templates: [
                    {
                        id: 'product_innovation',
                        title: 'New Product Development',
                        description: 'Develop innovative products for market needs',
                        problem: 'Identify market opportunities and develop innovative products that solve real customer problems while being commercially viable.',
                        tags: ['product', 'innovation', 'development'],
                        difficulty: 'medium',
                        estimatedTime: '20-30 minutes',
                        expectedOutcomes: ['Market research', 'Product concept', 'Development plan'],
                        industry: ['technology', 'consumer goods', 'healthcare']
                    },
                    {
                        id: 'ai_integration',
                        title: 'AI Integration Strategy',
                        description: 'Plan AI adoption across organization',
                        problem: 'Develop a strategy to integrate artificial intelligence into our business processes to improve efficiency, decision-making, and customer experience.',
                        tags: ['ai', 'technology', 'automation'],
                        difficulty: 'high',
                        estimatedTime: '25-35 minutes',
                        expectedOutcomes: ['AI readiness assessment', 'Integration roadmap', 'ROI projections'],
                        industry: ['technology', 'finance', 'healthcare']
                    }
                ]
            },
            operations: {
                name: 'Operations & Process',
                icon: '⚙️',
                color: 'orange',
                templates: [
                    {
                        id: 'supply_chain',
                        title: 'Supply Chain Optimization',
                        description: 'Improve supply chain efficiency and resilience',
                        problem: 'Optimize our supply chain to reduce costs, improve delivery times, and increase resilience against disruptions.',
                        tags: ['supply', 'logistics', 'optimization'],
                        difficulty: 'medium',
                        estimatedTime: '20-30 minutes',
                        expectedOutcomes: ['Supply chain analysis', 'Optimization strategies', 'Risk mitigation'],
                        industry: ['manufacturing', 'retail', 'logistics']
                    },
                    {
                        id: 'quality_improvement',
                        title: 'Quality Management System',
                        description: 'Implement comprehensive quality management',
                        problem: 'Design and implement a quality management system that ensures consistent product/service quality while reducing defects and customer complaints.',
                        tags: ['quality', 'process', 'standards'],
                        difficulty: 'medium',
                        estimatedTime: '25-35 minutes',
                        expectedOutcomes: ['Quality standards', 'Process improvements', 'Monitoring system'],
                        industry: ['manufacturing', 'healthcare', 'services']
                    }
                ]
            },
            people: {
                name: 'People & Culture',
                icon: '👥',
                color: 'pink',
                templates: [
                    {
                        id: 'employee_engagement',
                        title: 'Employee Engagement Initiative',
                        description: 'Improve workplace satisfaction and retention',
                        problem: 'Develop strategies to increase employee engagement, job satisfaction, and retention while fostering a positive workplace culture.',
                        tags: ['engagement', 'culture', 'retention'],
                        difficulty: 'medium',
                        estimatedTime: '20-30 minutes',
                        expectedOutcomes: ['Engagement assessment', 'Culture initiatives', 'Retention strategies'],
                        industry: ['all']
                    },
                    {
                        id: 'skills_development',
                        title: 'Skills Development Program',
                        description: 'Create comprehensive training and development plans',
                        problem: 'Design a skills development program that prepares our workforce for future challenges while addressing current skill gaps.',
                        tags: ['training', 'skills', 'development'],
                        difficulty: 'medium',
                        estimatedTime: '25-35 minutes',
                        expectedOutcomes: ['Skills assessment', 'Training program', 'Career pathways'],
                        industry: ['all']
                    }
                ]
            }
        };
    }

    /**
     * Tworzy UI dla template browsera
     */
    createTemplatesBrowser() {
        const browserHTML = `
            <div id="templates-browser" class="mt-6 bg-gray-800 p-6 rounded-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">📋 Problem Templates</h2>
                    <div class="flex gap-2">
                        <select id="template-category" class="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-sm">
                            <option value="all">All Categories</option>
                            <option value="business">💼 Business</option>
                            <option value="sustainability">🌱 Sustainability</option>
                            <option value="innovation">🔬 Innovation</option>
                            <option value="operations">⚙️ Operations</option>
                            <option value="people">👥 People</option>
                        </select>
                        <select id="template-difficulty" class="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-sm">
                            <option value="all">All Levels</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="high">Advanced</option>
                        </select>
                        <button id="create-custom-template" class="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm">
                            ➕ Create Custom
                        </button>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="mb-4">
                    <input type="text" id="template-search" placeholder="Search templates..." 
                           class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                </div>

                <!-- Templates Grid -->
                <div id="templates-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Templates will be inserted here -->
                </div>

                <!-- Recent Templates -->
                <div class="mt-6">
                    <h3 class="text-lg font-medium mb-3">🕒 Recently Used</h3>
                    <div id="recent-templates" class="flex gap-2 overflow-x-auto">
                        <div class="text-gray-400 text-sm whitespace-nowrap">No recent templates</div>
                    </div>
                </div>
            </div>
        `;

        // Insert after problem input
        const problemInput = document.querySelector('.bg-gray-800');
        problemInput.insertAdjacentHTML('afterend', browserHTML);

        this.renderTemplatesGrid();
        this.initializeTemplateEventListeners();
    }

    /**
     * Renderuje grid z templates
     */
    renderTemplatesGrid(filter = {}) {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        const allTemplates = this.getAllTemplatesFlat();
        const filtered = this.filterTemplates(allTemplates, filter);

        const templatesHTML = filtered.map(template => this.createTemplateCard(template)).join('');
        grid.innerHTML = templatesHTML;
    }

    /**
     * Tworzy kartę template
     */
    createTemplateCard(template) {
        const category = this.getCategoryForTemplate(template.id);
        const difficultyColor = {
            easy: 'green',
            medium: 'yellow',
            high: 'red'
        }[template.difficulty] || 'gray';

        const usageCount = this.templateUsageStats[template.id] || 0;

        return `
            <div class="template-card bg-gray-900 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition-all duration-200"
                 data-template-id="${template.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${category.icon}</span>
                        <div>
                            <h4 class="font-medium text-${category.color}-400">${template.title}</h4>
                            <p class="text-xs text-gray-400">${category.name}</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 bg-${difficultyColor}-600 rounded text-xs">
                        ${template.difficulty}
                    </span>
                </div>
                
                <p class="text-sm text-gray-300 mb-3 line-clamp-2">${template.description}</p>
                
                <div class="flex flex-wrap gap-1 mb-3">
                    ${template.tags.map(tag => 
                        `<span class="px-2 py-1 bg-gray-700 rounded text-xs">#${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="flex justify-between items-center text-xs text-gray-400">
                    <span>⏱️ ${template.estimatedTime}</span>
                    <span>👁️ ${usageCount} uses</span>
                </div>
                
                <div class="mt-3 flex gap-2">
                    <button class="use-template flex-1 px-3 py-2 bg-${category.color}-600 rounded hover:bg-${category.color}-700 text-sm">
                        Use Template
                    </button>
                    <button class="preview-template px-3 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">
                        👁️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Inicjalizuje event listenery dla templates
     */
    initializeTemplateEventListeners() {
        // Category filter
        document.getElementById('template-category')?.addEventListener('change', (e) => {
            this.filterAndRender();
        });

        // Difficulty filter
        document.getElementById('template-difficulty')?.addEventListener('change', (e) => {
            this.filterAndRender();
        });

        // Search
        document.getElementById('template-search')?.addEventListener('input', (e) => {
            this.filterAndRender();
        });

        // Create custom template
        document.getElementById('create-custom-template')?.addEventListener('click', () => {
            this.showCustomTemplateModal();
        });

        // Template cards event delegation
        document.getElementById('templates-grid')?.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (!card) return;

            const templateId = card.dataset.templateId;
            const template = this.getTemplateById(templateId);

            if (e.target.classList.contains('use-template')) {
                this.useTemplate(template);
            } else if (e.target.classList.contains('preview-template')) {
                this.previewTemplate(template);
            } else {
                this.previewTemplate(template);
            }
        });
    }

    /**
     * Filtruje i renderuje templates
     */
    filterAndRender() {
        const category = document.getElementById('template-category')?.value || 'all';
        const difficulty = document.getElementById('template-difficulty')?.value || 'all';
        const search = document.getElementById('template-search')?.value || '';

        const filter = {
            category: category !== 'all' ? category : null,
            difficulty: difficulty !== 'all' ? difficulty : null,
            search: search.trim()
        };

        this.renderTemplatesGrid(filter);
    }

    /**
     * Używa template
     */
    useTemplate(template) {
        // Fill problem input
        const topicInput = document.getElementById('topic-input');
        if (topicInput) {
            topicInput.value = template.problem;
            
            // Trigger input event to update any listeners
            topicInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Update usage stats
        this.templateUsageStats[template.id] = (this.templateUsageStats[template.id] || 0) + 1;
        this.saveUsageStats();

        // Update recent templates
        this.addToRecentTemplates(template);

        // Show notification
        this.showNotification(`Template "${template.title}" loaded successfully! 🎯`, 'success');

        // Auto-scroll to problem input
        topicInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Pokazuje preview template
     */
    previewTemplate(template) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const category = this.getCategoryForTemplate(template.id);
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-2xl w-full text-white m-4 max-h-96 overflow-y-auto">
                <div class="flex items-center gap-3 mb-4">
                    <span class="text-3xl">${category.icon}</span>
                    <div>
                        <h3 class="text-xl font-semibold text-${category.color}-400">${template.title}</h3>
                        <p class="text-gray-400">${category.name} • ${template.difficulty}</p>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h4 class="font-medium mb-2">Description:</h4>
                    <p class="text-gray-300">${template.description}</p>
                </div>
                
                <div class="mb-4">
                    <h4 class="font-medium mb-2">Problem Statement:</h4>
                    <div class="bg-gray-900 p-3 rounded text-sm text-gray-300">
                        "${template.problem}"
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <h5 class="font-medium mb-2 text-green-400">Expected Outcomes:</h5>
                        <ul class="text-sm text-gray-300">
                            ${template.expectedOutcomes.map(outcome => `<li>• ${outcome}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <h5 class="font-medium mb-2 text-blue-400">Details:</h5>
                        <div class="text-sm text-gray-300">
                            <p>⏱️ Time: ${template.estimatedTime}</p>
                            <p>🏭 Industry: ${template.industry.join(', ')}</p>
                            <p>📊 Difficulty: ${template.difficulty}</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-1 mb-4">
                    ${template.tags.map(tag => 
                        `<span class="px-2 py-1 bg-gray-700 rounded text-xs">#${tag}</span>`
                    ).join('')}
                </div>
                
                <div class="flex gap-3 justify-end">
                    <button id="close-preview" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">
                        Close
                    </button>
                    <button id="use-template-preview" class="px-4 py-2 bg-${category.color}-600 rounded hover:bg-${category.color}-700">
                        Use This Template
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#close-preview').addEventListener('click', () => modal.remove());
        modal.querySelector('#use-template-preview').addEventListener('click', () => {
            this.useTemplate(template);
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Pokazuje modal dla custom template
     */
    showCustomTemplateModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-2xl w-full text-white m-4">
                <h3 class="text-xl font-semibold mb-4">➕ Create Custom Template</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Title:</label>
                        <input type="text" id="custom-title" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Category:</label>
                        <select id="custom-category" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="business">💼 Business</option>
                            <option value="sustainability">🌱 Sustainability</option>
                            <option value="innovation">🔬 Innovation</option>
                            <option value="operations">⚙️ Operations</option>
                            <option value="people">👥 People</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Description:</label>
                    <input type="text" id="custom-description" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Problem Statement:</label>
                    <textarea id="custom-problem" rows="4" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded resize-none"></textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Tags (comma separated):</label>
                        <input type="text" id="custom-tags" placeholder="strategy, growth, innovation" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Difficulty:</label>
                        <select id="custom-difficulty" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="high">Advanced</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 justify-end">
                    <button id="cancel-custom" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">
                        Cancel
                    </button>
                    <button id="save-custom" class="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700">
                        Save Template
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#cancel-custom').addEventListener('click', () => modal.remove());
        modal.querySelector('#save-custom').addEventListener('click', () => {
            this.saveCustomTemplate(modal);
        });
    }

    /**
     * Zapisuje custom template
     */
    saveCustomTemplate(modal) {
        const title = modal.querySelector('#custom-title').value.trim();
        const category = modal.querySelector('#custom-category').value;
        const description = modal.querySelector('#custom-description').value.trim();
        const problem = modal.querySelector('#custom-problem').value.trim();
        const tags = modal.querySelector('#custom-tags').value.split(',').map(t => t.trim()).filter(t => t);
        const difficulty = modal.querySelector('#custom-difficulty').value;

        if (!title || !description || !problem) {
            this.showNotification('Please fill all required fields', 'error');
            return;
        }

        const customTemplate = {
            id: `custom_${Date.now()}`,
            title,
            description,
            problem,
            tags,
            difficulty,
            estimatedTime: 'Variable',
            expectedOutcomes: ['Custom solution'],
            industry: ['all'],
            isCustom: true,
            createdAt: Date.now()
        };

        this.userTemplates.push(customTemplate);
        this.saveUserTemplates();
        
        this.renderTemplatesGrid();
        this.showNotification(`Custom template "${title}" created successfully! 🎉`, 'success');
        
        modal.remove();
    }

    // Utility functions
    getAllTemplatesFlat() {
        const flat = [];
        Object.entries(this.templates).forEach(([categoryKey, category]) => {
            category.templates.forEach(template => {
                flat.push({ ...template, categoryKey });
            });
        });
        return [...flat, ...this.userTemplates.map(t => ({ ...t, categoryKey: 'custom' }))];
    }

    filterTemplates(templates, filter) {
        return templates.filter(template => {
            if (filter.category && template.categoryKey !== filter.category) return false;
            if (filter.difficulty && template.difficulty !== filter.difficulty) return false;
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                const searchable = `${template.title} ${template.description} ${template.tags.join(' ')}`.toLowerCase();
                if (!searchable.includes(searchLower)) return false;
            }
            return true;
        });
    }

    getCategoryForTemplate(templateId) {
        for (const [key, category] of Object.entries(this.templates)) {
            if (category.templates.find(t => t.id === templateId)) {
                return { ...category, key };
            }
        }
        return { name: 'Custom', icon: '⭐', color: 'purple', key: 'custom' };
    }

    getTemplateById(id) {
        const allTemplates = this.getAllTemplatesFlat();
        return allTemplates.find(t => t.id === id);
    }

    addToRecentTemplates(template) {
        const recent = JSON.parse(localStorage.getItem('ies_recent_templates') || '[]');
        const filtered = recent.filter(t => t.id !== template.id);
        filtered.unshift({ ...template, usedAt: Date.now() });
        
        const limited = filtered.slice(0, 5);
        localStorage.setItem('ies_recent_templates', JSON.stringify(limited));
        
        this.renderRecentTemplates();
    }

    renderRecentTemplates() {
        const container = document.getElementById('recent-templates');
        if (!container) return;

        const recent = JSON.parse(localStorage.getItem('ies_recent_templates') || '[]');
        
        if (recent.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm whitespace-nowrap">No recent templates</div>';
            return;
        }

        const recentHTML = recent.map(template => {
            const category = this.getCategoryForTemplate(template.id);
            return `
                <div class="recent-template-item bg-gray-900 p-2 rounded flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-gray-700"
                     data-template-id="${template.id}">
                    <span>${category.icon}</span>
                    <span class="text-sm">${template.title}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = recentHTML;

        // Add click handlers
        container.querySelectorAll('.recent-template-item').forEach(item => {
            item.addEventListener('click', () => {
                const template = this.getTemplateById(item.dataset.templateId);
                if (template) this.useTemplate(template);
            });
        });
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'green',
            error: 'red',
            info: 'blue'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 bg-${colors[type]}-600 text-white p-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Storage functions
    loadUserTemplates() {
        const stored = localStorage.getItem('ies_user_templates');
        return stored ? JSON.parse(stored) : [];
    }

    saveUserTemplates() {
        localStorage.setItem('ies_user_templates', JSON.stringify(this.userTemplates));
    }

    loadUsageStats() {
        const stored = localStorage.getItem('ies_template_usage');
        return stored ? JSON.parse(stored) : {};
    }

    saveUsageStats() {
        localStorage.setItem('ies_template_usage', JSON.stringify(this.templateUsageStats));
    }

    // Public API
    getPopularTemplates(limit = 5) {
        const allTemplates = this.getAllTemplatesFlat();
        return allTemplates
            .sort((a, b) => (this.templateUsageStats[b.id] || 0) - (this.templateUsageStats[a.id] || 0))
            .slice(0, limit);
    }

    searchTemplates(query) {
        return this.filterTemplates(this.getAllTemplatesFlat(), { search: query });
    }

    recommendTemplates(userInput) {
        // Simple keyword-based recommendation
        const keywords = userInput.toLowerCase().split(/\s+/);
        const allTemplates = this.getAllTemplatesFlat();
        
        return allTemplates
            .map(template => {
                let score = 0;
                const searchText = `${template.title} ${template.description} ${template.tags.join(' ')}`.toLowerCase();
                
                keywords.forEach(keyword => {
                    if (searchText.includes(keyword)) score++;
                });
                
                return { template, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.template);
    }
}

// Export singleton instance
export const problemTemplates = new ProblemTemplatesSystem();
