/**
 * Knowledge Base System
 * Stores, searches and provides intelligent access to problem-solving knowledge
 */

export class KnowledgeBaseSystem {
    constructor() {
        this.dbManager = new DatabaseSessionManager();
        this.knowledgeBase = this.initializeKnowledgeBase();
        this.userContributions = [];
        this.searchIndex = [];
        this.favorites = [];
        this.userId = 'user_1'; // Default user ID - should come from auth system
        
        this.initializeAsync();
    }

    /**
     * Initialize the system asynchronously
     */
    async initializeAsync() {
        try {
            await this.loadUserContributions();
            await this.loadFavorites();
            this.searchIndex = this.buildSearchIndex();
            this.initializeKnowledgeBaseUI();
        } catch (error) {
            console.error('Failed to initialize Knowledge Base:', error);
            // Fallback to show UI even if DB loading fails
            this.initializeKnowledgeBaseUI();
        }
    }

    /**
     * Inicjalizuje bazę wiedzy z pre-built content
     */
    initializeKnowledgeBase() {
        return {
            methodologies: [
                {
                    id: 'design_thinking',
                    title: 'Design Thinking Process',
                    category: 'methodology',
                    description: 'Human-centered approach to innovation and problem-solving',
                    content: `
                        <h3>Design Thinking - 5 Stage Process</h3>
                        <div class="methodology-stages">
                            <div class="stage">
                                <h4>1. Empathize</h4>
                                <p>Understand the human needs involved</p>
                                <ul>
                                    <li>Conduct user interviews</li>
                                    <li>Observe user behavior</li>
                                    <li>Create empathy maps</li>
                                </ul>
                            </div>
                            <div class="stage">
                                <h4>2. Define</h4>
                                <p>Frame the problem statement</p>
                                <ul>
                                    <li>Synthesize observations</li>
                                    <li>Create point of view statements</li>
                                    <li>Define core problems</li>
                                </ul>
                            </div>
                            <div class="stage">
                                <h4>3. Ideate</h4>
                                <p>Generate creative solutions</p>
                                <ul>
                                    <li>Brainstorm extensively</li>
                                    <li>Use ideation techniques</li>
                                    <li>Think outside the box</li>
                                </ul>
                            </div>
                            <div class="stage">
                                <h4>4. Prototype</h4>
                                <p>Build testable representations</p>
                                <ul>
                                    <li>Create low-fidelity prototypes</li>
                                    <li>Test key assumptions</li>
                                    <li>Iterate quickly</li>
                                </ul>
                            </div>
                            <div class="stage">
                                <h4>5. Test</h4>
                                <p>Validate solutions with users</p>
                                <ul>
                                    <li>Gather user feedback</li>
                                    <li>Refine solutions</li>
                                    <li>Iterate based on learnings</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    tags: ['design', 'innovation', 'user-centered', 'methodology'],
                    difficulty: 'medium',
                    timeToRead: '8 minutes',
                    lastUpdated: Date.now() - 86400000,
                    rating: 4.8,
                    views: 1247,
                    helpful: 156
                },
                {
                    id: 'lean_startup',
                    title: 'Lean Startup Methodology',
                    category: 'methodology',
                    description: 'Build-Measure-Learn approach for rapid experimentation',
                    content: `
                        <h3>Lean Startup - Build-Measure-Learn Cycle</h3>
                        <div class="lean-cycle">
                            <div class="cycle-step">
                                <h4>Build</h4>
                                <p>Create Minimum Viable Product (MVP)</p>
                                <ul>
                                    <li>Start with minimal features</li>
                                    <li>Focus on core value proposition</li>
                                    <li>Build quickly and efficiently</li>
                                </ul>
                            </div>
                            <div class="cycle-step">
                                <h4>Measure</h4>
                                <p>Collect data from real users</p>
                                <ul>
                                    <li>Define key metrics</li>
                                    <li>Track user behavior</li>
                                    <li>Gather quantitative data</li>
                                </ul>
                            </div>
                            <div class="cycle-step">
                                <h4>Learn</h4>
                                <p>Validate or pivot based on insights</p>
                                <ul>
                                    <li>Analyze collected data</li>
                                    <li>Validate assumptions</li>
                                    <li>Decide to persevere or pivot</li>
                                </ul>
                            </div>
                        </div>
                        <div class="key-concepts">
                            <h4>Key Concepts:</h4>
                            <ul>
                                <li><strong>MVP:</strong> Minimum Viable Product</li>
                                <li><strong>Pivot:</strong> Change direction based on learning</li>
                                <li><strong>Validated Learning:</strong> Evidence-based progress</li>
                            </ul>
                        </div>
                    `,
                    tags: ['startup', 'lean', 'mvp', 'experimentation'],
                    difficulty: 'medium',
                    timeToRead: '6 minutes',
                    lastUpdated: Date.now() - 172800000,
                    rating: 4.6,
                    views: 892,
                    helpful: 134
                }
            ],
            bestPractices: [
                {
                    id: 'problem_definition',
                    title: 'How to Define Problems Effectively',
                    category: 'best-practice',
                    description: 'Framework for clear and actionable problem statements',
                    content: `
                        <h3>Effective Problem Definition Framework</h3>
                        <div class="framework">
                            <h4>1. Use the 5W+H Method</h4>
                            <ul>
                                <li><strong>Who:</strong> Who is affected by this problem?</li>
                                <li><strong>What:</strong> What exactly is the problem?</li>
                                <li><strong>When:</strong> When does this problem occur?</li>
                                <li><strong>Where:</strong> Where does this problem happen?</li>
                                <li><strong>Why:</strong> Why is this a problem worth solving?</li>
                                <li><strong>How:</strong> How does this problem manifest?</li>
                            </ul>
                            
                            <h4>2. Problem Statement Template</h4>
                            <div class="template">
                                "For [target users], the problem of [problem description] 
                                impacts [affected areas] resulting in [negative consequences]. 
                                A successful solution would [desired outcome]."
                            </div>
                            
                            <h4>3. Validation Checklist</h4>
                            <ul>
                                <li>Is the problem specific and measurable?</li>
                                <li>Can you quantify the impact?</li>
                                <li>Is it within your scope to solve?</li>
                                <li>Do stakeholders agree this is important?</li>
                                <li>Have you avoided solution bias?</li>
                            </ul>
                        </div>
                    `,
                    tags: ['problem-definition', 'framework', 'clarity'],
                    difficulty: 'easy',
                    timeToRead: '4 minutes',
                    lastUpdated: Date.now() - 259200000,
                    rating: 4.9,
                    views: 2156,
                    helpful: 287
                }
            ],
            caseStudies: [
                {
                    id: 'airbnb_growth',
                    title: 'How Airbnb Solved the Trust Problem',
                    category: 'case-study',
                    description: 'Case study on building trust in a two-sided marketplace',
                    content: `
                        <h3>Airbnb: Solving the Trust Problem</h3>
                        <div class="case-study">
                            <h4>The Challenge</h4>
                            <p>How do you get strangers to stay in each other's homes?</p>
                            
                            <h4>The Problem</h4>
                            <ul>
                                <li>Users hesitant to book with unknown hosts</li>
                                <li>Hosts worried about property damage</li>
                                <li>No established trust mechanisms</li>
                            </ul>
                            
                            <h4>The Solution Approach</h4>
                            <ol>
                                <li><strong>Identity Verification:</strong> Multiple verification methods</li>
                                <li><strong>Review System:</strong> Bidirectional ratings and reviews</li>
                                <li><strong>Insurance Coverage:</strong> Host guarantee program</li>
                                <li><strong>Communication Tools:</strong> Secure messaging platform</li>
                                <li><strong>Photography:</strong> Professional photo service</li>
                            </ol>
                            
                            <h4>Key Learnings</h4>
                            <ul>
                                <li>Trust can be systematically built through design</li>
                                <li>Multiple touchpoints reinforce confidence</li>
                                <li>Community self-regulation is powerful</li>
                                <li>Insurance reduces risk perception</li>
                            </ul>
                            
                            <h4>Results</h4>
                            <p>From 0 to 150M+ users, fundamentally changing travel industry</p>
                        </div>
                    `,
                    tags: ['trust', 'marketplace', 'scaling', 'startup'],
                    difficulty: 'medium',
                    timeToRead: '7 minutes',
                    lastUpdated: Date.now() - 345600000,
                    rating: 4.7,
                    views: 1876,
                    helpful: 203
                }
            ],
            tools: [
                {
                    id: 'swot_analysis',
                    title: 'SWOT Analysis Framework',
                    category: 'tool',
                    description: 'Strategic planning tool for evaluating Strengths, Weaknesses, Opportunities, and Threats',
                    content: `
                        <h3>SWOT Analysis - Complete Guide</h3>
                        <div class="swot-matrix">
                            <div class="swot-quadrant strengths">
                                <h4>Strengths (Internal, Positive)</h4>
                                <p>What advantages do you have?</p>
                                <ul>
                                    <li>Unique capabilities</li>
                                    <li>Strong resources</li>
                                    <li>Competitive advantages</li>
                                    <li>Established reputation</li>
                                </ul>
                            </div>
                            <div class="swot-quadrant weaknesses">
                                <h4>Weaknesses (Internal, Negative)</h4>
                                <p>What needs improvement?</p>
                                <ul>
                                    <li>Resource limitations</li>
                                    <li>Skill gaps</li>
                                    <li>Process inefficiencies</li>
                                    <li>Competitive disadvantages</li>
                                </ul>
                            </div>
                            <div class="swot-quadrant opportunities">
                                <h4>Opportunities (External, Positive)</h4>
                                <p>What external factors could help?</p>
                                <ul>
                                    <li>Market trends</li>
                                    <li>Technology advances</li>
                                    <li>Regulatory changes</li>
                                    <li>Partnership possibilities</li>
                                </ul>
                            </div>
                            <div class="swot-quadrant threats">
                                <h4>Threats (External, Negative)</h4>
                                <p>What external factors pose risks?</p>
                                <ul>
                                    <li>Competition</li>
                                    <li>Market changes</li>
                                    <li>Economic factors</li>
                                    <li>Regulatory risks</li>
                                </ul>
                            </div>
                        </div>
                        <div class="swot-strategies">
                            <h4>Strategic Actions:</h4>
                            <ul>
                                <li><strong>SO (Strengths-Opportunities):</strong> Use strengths to capitalize on opportunities</li>
                                <li><strong>WO (Weaknesses-Opportunities):</strong> Address weaknesses to pursue opportunities</li>
                                <li><strong>ST (Strengths-Threats):</strong> Use strengths to mitigate threats</li>
                                <li><strong>WT (Weaknesses-Threats):</strong> Minimize weaknesses and avoid threats</li>
                            </ul>
                        </div>
                    `,
                    tags: ['strategy', 'analysis', 'planning', 'framework'],
                    difficulty: 'easy',
                    timeToRead: '5 minutes',
                    lastUpdated: Date.now() - 432000000,
                    rating: 4.5,
                    views: 3421,
                    helpful: 445
                }
            ]
        };
    }

    /**
     * Tworzy UI dla knowledge base
     */
    initializeKnowledgeBaseUI() {
        const knowledgeBaseHTML = `
            <div id="knowledge-base" class="mt-6 bg-gray-800 p-6 rounded-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">📚 Knowledge Base</h2>
                    <div class="flex gap-2">
                        <button id="add-knowledge" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm">
                            ➕ Add Knowledge
                        </button>
                        <button id="kb-settings" class="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 text-sm">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="mb-6">
                    <div class="flex gap-3 mb-3">
                        <input type="text" id="kb-search" placeholder="Search knowledge base..." 
                               class="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                        <select id="kb-category" class="px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="all">All Categories</option>
                            <option value="methodology">Methodologies</option>
                            <option value="best-practice">Best Practices</option>
                            <option value="case-study">Case Studies</option>
                            <option value="tool">Tools</option>
                        </select>
                        <select id="kb-difficulty" class="px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="all">All Levels</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Advanced</option>
                        </select>
                    </div>
                </div>

                <!-- Quick Access Tabs -->
                <div class="mb-6">
                    <div class="flex border-b border-gray-700">
                        <button class="kb-tab active px-4 py-2 text-sm border-b-2 border-blue-500" data-tab="all">
                            📖 All Content
                        </button>
                        <button class="kb-tab px-4 py-2 text-sm border-b-2 border-transparent hover:border-gray-500" data-tab="favorites">
                            ⭐ Favorites
                        </button>
                        <button class="kb-tab px-4 py-2 text-sm border-b-2 border-transparent hover:border-gray-500" data-tab="recent">
                            🕒 Recent
                        </button>
                        <button class="kb-tab px-4 py-2 text-sm border-b-2 border-transparent hover:border-gray-500" data-tab="trending">
                            🔥 Trending
                        </button>
                    </div>
                </div>

                <!-- Content Grid -->
                <div id="kb-content-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Content cards will be populated here -->
                </div>

                <!-- Pagination -->
                <div id="kb-pagination" class="mt-6 flex justify-center gap-2">
                    <!-- Pagination will be added here -->
                </div>
            </div>
        `;

        // Insert after collaboration hub
        const collaborationSection = document.getElementById('collaboration-hub');
        if (collaborationSection) {
            collaborationSection.insertAdjacentHTML('afterend', knowledgeBaseHTML);
        } else {
            // Insert before SSE log as fallback
            const sseLog = document.querySelector('#sse-log').parentElement;
            sseLog.insertAdjacentHTML('beforebegin', knowledgeBaseHTML);
        }

        this.setupKnowledgeBaseEventListeners();
        this.renderKnowledgeContent();
    }

    /**
     * Setup event listeners dla knowledge base
     */
    setupKnowledgeBaseEventListeners() {
        // Search
        document.getElementById('kb-search')?.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // Category filter
        document.getElementById('kb-category')?.addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        // Difficulty filter
        document.getElementById('kb-difficulty')?.addEventListener('change', (e) => {
            this.filterByDifficulty(e.target.value);
        });

        // Tab switching
        document.querySelectorAll('.kb-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add knowledge
        document.getElementById('add-knowledge')?.addEventListener('click', () => {
            this.showAddKnowledgeModal();
        });
    }

    /**
     * Renderuje content w knowledge base
     */
    renderKnowledgeContent(filter = {}) {
        const container = document.getElementById('kb-content-grid');
        if (!container) return;

        const allContent = this.getAllContent();
        const filteredContent = this.applyFilters(allContent, filter);

        const contentHTML = filteredContent.map(item => this.createContentCard(item)).join('');
        container.innerHTML = contentHTML;

        // Add click handlers
        this.attachContentCardHandlers();
    }

    /**
     * Tworzy kartę content
     */
    createContentCard(item) {
        const categoryIcons = {
            methodology: '🔬',
            'best-practice': '✅',
            'case-study': '📊',
            tool: '🛠️'
        };

        const difficultyColors = {
            easy: 'green',
            medium: 'yellow',
            hard: 'red'
        };

        const isFavorite = this.favorites.includes(item.id);

        return `
            <div class="kb-card bg-gray-900 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition-all"
                 data-item-id="${item.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${categoryIcons[item.category] || '📄'}</span>
                        <div>
                            <h4 class="font-medium text-blue-400">${item.title}</h4>
                            <p class="text-xs text-gray-400 capitalize">${item.category.replace('-', ' ')}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <button class="favorite-btn ${isFavorite ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-400" 
                                data-item-id="${item.id}">
                            ${isFavorite ? '⭐' : '☆'}
                        </button>
                        <span class="px-2 py-1 bg-${difficultyColors[item.difficulty]}-600 rounded text-xs">
                            ${item.difficulty}
                        </span>
                    </div>
                </div>
                
                <p class="text-sm text-gray-300 mb-3 line-clamp-2">${item.description}</p>
                
                <div class="flex flex-wrap gap-1 mb-3">
                    ${item.tags.slice(0, 3).map(tag => 
                        `<span class="px-2 py-1 bg-gray-700 rounded text-xs">#${tag}</span>`
                    ).join('')}
                    ${item.tags.length > 3 ? 
                        `<span class="px-2 py-1 bg-gray-700 rounded text-xs">+${item.tags.length - 3}</span>` : ''
                    }
                </div>
                
                <div class="flex justify-between items-center text-xs text-gray-400">
                    <div class="flex items-center gap-3">
                        <span>📖 ${item.timeToRead}</span>
                        <span>👀 ${item.views}</span>
                        <span>👍 ${item.helpful}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span>⭐</span>
                        <span>${item.rating.toFixed(1)}</span>
                    </div>
                </div>
                
                <div class="mt-3 flex gap-2">
                    <button class="read-content flex-1 px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                        📖 Read
                    </button>
                    <button class="quick-preview px-3 py-2 bg-gray-600 rounded hover:bg-gray-500 text-sm">
                        👁️
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Dodaje event handlery do content cards
     */
    attachContentCardHandlers() {
        // Read content
        document.querySelectorAll('.read-content').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = e.target.closest('.kb-card');
                const itemId = card.dataset.itemId;
                await this.showContentReader(itemId);
            });
        });

        // Favorite toggle
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const itemId = e.target.dataset.itemId;
                await this.toggleFavorite(itemId);
            });
        });

        // Quick preview
        document.querySelectorAll('.quick-preview').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.kb-card');
                const itemId = card.dataset.itemId;
                this.showQuickPreview(itemId);
            });
        });
    }

    /**
     * Pokazuje content reader
     */
    async showContentReader(itemId) {
        const item = this.findContentById(itemId);
        if (!item) return;

        // Track view
        item.views++;
        await this.saveViewStatistics(itemId);

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-4xl w-full text-white m-4 max-h-96 overflow-y-auto">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-2xl font-semibold text-blue-400">${item.title}</h3>
                        <p class="text-gray-400 mt-1">${item.description}</p>
                        <div class="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span>📖 ${item.timeToRead}</span>
                            <span>⭐ ${item.rating.toFixed(1)}</span>
                            <span>👀 ${item.views} views</span>
                            <span>👍 ${item.helpful} helpful</span>
                        </div>
                    </div>
                    <button id="close-reader" class="text-gray-400 hover:text-white text-xl">✕</button>
                </div>
                
                <div class="prose prose-invert max-w-none">
                    ${item.content}
                </div>
                
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                    <div class="flex gap-2">
                        <button id="mark-helpful" class="px-3 py-2 bg-green-600 rounded hover:bg-green-700 text-sm">
                            👍 Helpful
                        </button>
                        <button id="add-to-favorites" class="px-3 py-2 bg-yellow-600 rounded hover:bg-yellow-700 text-sm">
                            ⭐ Add to Favorites
                        </button>
                        <button id="share-content" class="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                            🔗 Share
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <button id="download-content" class="px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 text-sm">
                            📥 Download
                        </button>
                        <button id="print-content" class="px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 text-sm">
                            🖨️ Print
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#close-reader').addEventListener('click', () => modal.remove());
        modal.querySelector('#mark-helpful').addEventListener('click', () => {
            this.markAsHelpful(itemId);
            modal.remove();
        });
        modal.querySelector('#add-to-favorites').addEventListener('click', async () => {
            await this.toggleFavorite(itemId);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Pokazuje add knowledge modal
     */
    showAddKnowledgeModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg max-w-2xl w-full text-white m-4">
                <h3 class="text-xl font-semibold mb-4">➕ Add to Knowledge Base</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Title:</label>
                        <input type="text" id="kb-title" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Category:</label>
                        <select id="kb-new-category" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="methodology">Methodology</option>
                            <option value="best-practice">Best Practice</option>
                            <option value="case-study">Case Study</option>
                            <option value="tool">Tool</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Description:</label>
                    <input type="text" id="kb-description" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Content:</label>
                    <textarea id="kb-content" rows="8" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded resize-none"></textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Tags (comma separated):</label>
                        <input type="text" id="kb-tags" placeholder="tag1, tag2, tag3" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Difficulty:</label>
                        <select id="kb-new-difficulty" class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded">
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Advanced</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 justify-end">
                    <button id="cancel-kb-add" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">
                        Cancel
                    </button>
                    <button id="save-kb-content" class="px-4 py-2 bg-green-600 rounded hover:bg-green-700">
                        Save to Knowledge Base
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#cancel-kb-add').addEventListener('click', () => modal.remove());
        modal.querySelector('#save-kb-content').addEventListener('click', async () => {
            await this.saveUserContribution(modal);
        });
    }

    /**
     * Zapisuje user contribution
     */
    async saveUserContribution(modal) {
        const title = modal.querySelector('#kb-title').value.trim();
        const category = modal.querySelector('#kb-new-category').value;
        const description = modal.querySelector('#kb-description').value.trim();
        const content = modal.querySelector('#kb-content').value.trim();
        const tags = modal.querySelector('#kb-tags').value.split(',').map(t => t.trim()).filter(t => t);
        const difficulty = modal.querySelector('#kb-new-difficulty').value;

        if (!title || !description || !content) {
            this.showNotification('Please fill all required fields', 'error');
            return;
        }

        const newContent = {
            id: `user_${Date.now()}`,
            title,
            category,
            description,
            content: `<div class="user-content">${content.replace(/\n/g, '<br>')}</div>`,
            tags,
            difficulty,
            timeToRead: `${Math.ceil(content.length / 1000)} minutes`,
            lastUpdated: Date.now(),
            rating: 0,
            views: 0,
            helpful: 0,
            isUserContent: true,
            author: 'You'
        };

        try {
            // Save to database
            await this.dbManager.saveKnowledgeContribution(this.userId, newContent);
            
            // Update local state
            this.userContributions.push(newContent);
            this.updateSearchIndex();
            this.renderKnowledgeContent();
            
            this.showNotification(`"${title}" added to knowledge base! 🎉`, 'success');
            modal.remove();
        } catch (error) {
            console.error('Failed to save contribution:', error);
            this.showNotification('Failed to save contribution. Please try again.', 'error');
        }
    }

    // Utility functions
    getAllContent() {
        const allContent = [];
        Object.values(this.knowledgeBase).forEach(category => {
            allContent.push(...category);
        });
        allContent.push(...this.userContributions);
        return allContent;
    }

    findContentById(id) {
        return this.getAllContent().find(item => item.id === id);
    }

    applyFilters(content, filter) {
        return content.filter(item => {
            if (filter.category && filter.category !== 'all' && item.category !== filter.category) return false;
            if (filter.difficulty && filter.difficulty !== 'all' && item.difficulty !== filter.difficulty) return false;
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                const searchable = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
                if (!searchable.includes(searchLower)) return false;
            }
            return true;
        });
    }

    performSearch(query) {
        this.renderKnowledgeContent({ search: query });
    }

    filterByCategory(category) {
        this.renderKnowledgeContent({ category });
    }

    filterByDifficulty(difficulty) {
        this.renderKnowledgeContent({ difficulty });
    }

    switchTab(tab) {
        // Update tab UI
        document.querySelectorAll('.kb-tab').forEach(t => {
            t.classList.remove('active', 'border-blue-500');
            t.classList.add('border-transparent');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        activeTab.classList.add('active', 'border-blue-500');
        activeTab.classList.remove('border-transparent');

        // Filter content based on tab
        switch (tab) {
            case 'favorites':
                this.showFavorites();
                break;
            case 'recent':
                this.showRecent();
                break;
            case 'trending':
                this.showTrending();
                break;
            default:
                this.renderKnowledgeContent();
        }
    }

    showFavorites() {
        const favorites = this.getAllContent().filter(item => this.favorites.includes(item.id));
        const container = document.getElementById('kb-content-grid');
        if (favorites.length === 0) {
            container.innerHTML = '<div class="col-span-3 text-center text-gray-400 py-8">No favorites yet</div>';
        } else {
            container.innerHTML = favorites.map(item => this.createContentCard(item)).join('');
            this.attachContentCardHandlers();
        }
    }

    showRecent() {
        const recent = this.getAllContent()
            .sort((a, b) => b.lastUpdated - a.lastUpdated)
            .slice(0, 6);
        const container = document.getElementById('kb-content-grid');
        container.innerHTML = recent.map(item => this.createContentCard(item)).join('');
        this.attachContentCardHandlers();
    }

    showTrending() {
        const trending = this.getAllContent()
            .sort((a, b) => (b.views + b.helpful * 2) - (a.views + a.helpful * 2))
            .slice(0, 6);
        const container = document.getElementById('kb-content-grid');
        container.innerHTML = trending.map(item => this.createContentCard(item)).join('');
        this.attachContentCardHandlers();
    }

    async toggleFavorite(itemId) {
        const index = this.favorites.indexOf(itemId);
        const isFavorite = index > -1;
        
        try {
            if (isFavorite) {
                this.favorites.splice(index, 1);
                await this.dbManager.removeKnowledgeFavorite(this.userId, itemId);
            } else {
                this.favorites.push(itemId);
                await this.dbManager.addKnowledgeFavorite(this.userId, itemId);
            }
            
            this.renderKnowledgeContent(); // Refresh to update favorite stars
        } catch (error) {
            console.error('Failed to update favorite:', error);
            this.showNotification('Failed to update favorite. Please try again.', 'error');
        }
    }

    markAsHelpful(itemId) {
        const item = this.findContentById(itemId);
        if (item) {
            item.helpful++;
            this.showNotification('Thanks for your feedback! 👍', 'success');
        }
    }

    buildSearchIndex() {
        // Simple search index implementation
        return this.getAllContent().map(item => ({
            id: item.id,
            searchText: `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase()
        }));
    }

    updateSearchIndex() {
        this.searchIndex = this.buildSearchIndex();
    }

    showQuickPreview(itemId) {
        const item = this.findContentById(itemId);
        if (!item) return;

        this.showNotification(`Quick preview: ${item.title} - ${item.description}`, 'info');
    }

    // Storage functions
    async loadUserContributions() {
        try {
            const contributions = await this.dbManager.getUserKnowledgeContributions(this.userId);
            this.userContributions = contributions || [];
        } catch (error) {
            console.error('Failed to load user contributions:', error);
            this.userContributions = [];
        }
    }

    async loadFavorites() {
        try {
            const favorites = await this.dbManager.getUserKnowledgeFavorites(this.userId);
            this.favorites = favorites || [];
        } catch (error) {
            console.error('Failed to load favorites:', error);
            this.favorites = [];
        }
    }

    async saveViewStatistics(itemId) {
        try {
            await this.dbManager.saveKnowledgeViewStat(this.userId, itemId);
        } catch (error) {
            console.error('Failed to save view statistics:', error);
        }
    }

    showNotification(message, type = 'info') {
        const colors = { success: 'green', error: 'red', info: 'blue' };
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 bg-${colors[type]}-600 text-white p-3 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Export singleton instance
export const knowledgeBase = new KnowledgeBaseSystem();
