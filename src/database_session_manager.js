const db = require('./db');

/**
 * Database Session Manager
 * Provides full CRUD operations for sessions, iterations, user profiles, and analytics
 * Replaces localStorage with PostgreSQL persistence
 */
class DatabaseSessionManager {
    constructor() {
        this.db = db;
    }

    // ===== SESSION CRUD OPERATIONS =====

    /**
     * Create a new session
     */
    async createSession(sessionData) {
        try {
            const {
                user_id,
                session_name,
                status = 'active',
                start_time = new Date(),
                metadata = {}
            } = sessionData;

            const query = `
                INSERT INTO sessions (user_id, session_name, status, start_time, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                user_id,
                session_name,
                status,
                start_time,
                JSON.stringify(metadata)
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        try {
            const query = `
                SELECT s.*, 
                       json_agg(
                           json_build_object(
                               'id', i.id,
                               'iteration_number', i.iteration_number,
                               'start_time', i.start_time,
                               'end_time', i.end_time,
                               'status', i.status,
                               'data', i.data,
                               'created_at', i.created_at
                           ) ORDER BY i.iteration_number
                       ) FILTER (WHERE i.id IS NOT NULL) as iterations
                FROM sessions s
                LEFT JOIN iterations i ON s.id = i.session_id
                WHERE s.id = $1
                GROUP BY s.id
            `;
            
            const result = await this.db.query(query, [sessionId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            session.metadata = typeof session.metadata === 'string' 
                ? JSON.parse(session.metadata) 
                : session.metadata;
            session.iterations = session.iterations || [];
            
            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId, limit = 50) {
        try {
            const query = `
                SELECT s.*, 
                       COUNT(i.id) as iteration_count,
                       MAX(i.end_time) as last_iteration_time
                FROM sessions s
                LEFT JOIN iterations i ON s.id = i.session_id
                WHERE s.user_id = $1
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [userId, limit]);
            
            return result.rows.map(session => ({
                ...session,
                metadata: typeof session.metadata === 'string' 
                    ? JSON.parse(session.metadata) 
                    : session.metadata
            }));
        } catch (error) {
            console.error('Error getting user sessions:', error);
            throw error;
        }
    }

    /**
     * Update session
     */
    async updateSession(sessionId, updateData) {
        try {
            const {
                session_name,
                status,
                end_time,
                metadata
            } = updateData;

            const updates = [];
            const values = [];
            let paramCount = 1;

            if (session_name !== undefined) {
                updates.push(`session_name = $${paramCount++}`);
                values.push(session_name);
            }
            if (status !== undefined) {
                updates.push(`status = $${paramCount++}`);
                values.push(status);
            }
            if (end_time !== undefined) {
                updates.push(`end_time = $${paramCount++}`);
                values.push(end_time);
            }
            if (metadata !== undefined) {
                updates.push(`metadata = $${paramCount++}`);
                values.push(JSON.stringify(metadata));
            }

            updates.push(`updated_at = NOW()`);
            values.push(sessionId);

            const query = `
                UPDATE sessions 
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;
            
            const result = await this.db.query(query, values);
            
            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            session.metadata = typeof session.metadata === 'string' 
                ? JSON.parse(session.metadata) 
                : session.metadata;
            
            return session;
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    /**
     * Delete session and all its iterations
     */
    async deleteSession(sessionId) {
        try {
            // Delete iterations first (foreign key constraint)
            await this.db.query('DELETE FROM iterations WHERE session_id = $1', [sessionId]);
            
            // Delete session
            const result = await this.db.query(
                'DELETE FROM sessions WHERE id = $1 RETURNING *',
                [sessionId]
            );
            
            return result.rows.length > 0;
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    // ===== ITERATION CRUD OPERATIONS =====

    /**
     * Create a new iteration
     */
    async createIteration(iterationData) {
        try {
            const {
                session_id,
                iteration_number,
                start_time = new Date(),
                status = 'active',
                data = {}
            } = iterationData;

            const query = `
                INSERT INTO iterations (session_id, iteration_number, start_time, status, data, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                session_id,
                iteration_number,
                start_time,
                status,
                JSON.stringify(data)
            ]);

            const iteration = result.rows[0];
            iteration.data = typeof iteration.data === 'string' 
                ? JSON.parse(iteration.data) 
                : iteration.data;
            
            return iteration;
        } catch (error) {
            console.error('Error creating iteration:', error);
            throw error;
        }
    }

    /**
     * Update iteration
     */
    async updateIteration(iterationId, updateData) {
        try {
            const {
                end_time,
                status,
                data
            } = updateData;

            const updates = [];
            const values = [];
            let paramCount = 1;

            if (end_time !== undefined) {
                updates.push(`end_time = $${paramCount++}`);
                values.push(end_time);
            }
            if (status !== undefined) {
                updates.push(`status = $${paramCount++}`);
                values.push(status);
            }
            if (data !== undefined) {
                updates.push(`data = $${paramCount++}`);
                values.push(JSON.stringify(data));
            }

            values.push(iterationId);

            const query = `
                UPDATE iterations 
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;
            
            const result = await this.db.query(query, values);
            
            if (result.rows.length === 0) {
                return null;
            }

            const iteration = result.rows[0];
            iteration.data = typeof iteration.data === 'string' 
                ? JSON.parse(iteration.data) 
                : iteration.data;
            
            return iteration;
        } catch (error) {
            console.error('Error updating iteration:', error);
            throw error;
        }
    }

    /**
     * Get iterations for a session
     */
    async getSessionIterations(sessionId) {
        try {
            const query = `
                SELECT * FROM iterations 
                WHERE session_id = $1 
                ORDER BY iteration_number ASC
            `;
            
            const result = await this.db.query(query, [sessionId]);
            
            return result.rows.map(iteration => ({
                ...iteration,
                data: typeof iteration.data === 'string' 
                    ? JSON.parse(iteration.data) 
                    : iteration.data
            }));
        } catch (error) {
            console.error('Error getting session iterations:', error);
            throw error;
        }
    }

    // ===== USER PROFILE CRUD OPERATIONS =====

    /**
     * Create or update user profile
     */
    async saveUserProfile(userId, profileData) {
        try {
            const query = `
                INSERT INTO user_profiles (user_id, profile_data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    profile_data = $2,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                userId,
                JSON.stringify(profileData)
            ]);

            const profile = result.rows[0];
            profile.profile_data = typeof profile.profile_data === 'string' 
                ? JSON.parse(profile.profile_data) 
                : profile.profile_data;
            
            return profile;
        } catch (error) {
            console.error('Error saving user profile:', error);
            throw error;
        }
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        try {
            const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
            const result = await this.db.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const profile = result.rows[0];
            profile.profile_data = typeof profile.profile_data === 'string' 
                ? JSON.parse(profile.profile_data) 
                : profile.profile_data;
            
            return profile;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    // ===== ANALYTICS CRUD OPERATIONS =====

    /**
     * Save analytics data
     */
    async saveAnalytics(userId, analyticsData) {
        try {
            const query = `
                INSERT INTO user_analytics (user_id, analytics_data, created_at)
                VALUES ($1, $2, NOW())
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                userId,
                JSON.stringify(analyticsData)
            ]);

            const analytics = result.rows[0];
            analytics.analytics_data = typeof analytics.analytics_data === 'string' 
                ? JSON.parse(analytics.analytics_data) 
                : analytics.analytics_data;
            
            return analytics;
        } catch (error) {
            console.error('Error saving analytics:', error);
            throw error;
        }
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(userId, limit = 100) {
        try {
            const query = `
                SELECT * FROM user_analytics 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [userId, limit]);
            
            return result.rows.map(analytics => ({
                ...analytics,
                analytics_data: typeof analytics.analytics_data === 'string' 
                    ? JSON.parse(analytics.analytics_data) 
                    : analytics.analytics_data
            }));
        } catch (error) {
            console.error('Error getting user analytics:', error);
            throw error;
        }
    }

    // ===== KNOWLEDGE BASE CRUD OPERATIONS =====

    /**
     * Save user knowledge contribution
     */
    async saveUserKnowledge(userId, knowledgeData) {
        try {
            const query = `
                INSERT INTO user_knowledge (user_id, knowledge_data, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    knowledge_data = $2,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                userId,
                JSON.stringify(knowledgeData)
            ]);

            const knowledge = result.rows[0];
            knowledge.knowledge_data = typeof knowledge.knowledge_data === 'string' 
                ? JSON.parse(knowledge.knowledge_data) 
                : knowledge.knowledge_data;
            
            return knowledge;
        } catch (error) {
            console.error('Error saving user knowledge:', error);
            throw error;
        }
    }

    /**
     * Get user knowledge
     */
    async getUserKnowledge(userId) {
        try {
            const query = 'SELECT * FROM user_knowledge WHERE user_id = $1';
            const result = await this.db.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const knowledge = result.rows[0];
            knowledge.knowledge_data = typeof knowledge.knowledge_data === 'string' 
                ? JSON.parse(knowledge.knowledge_data) 
                : knowledge.knowledge_data;
            
            return knowledge;
        } catch (error) {
            console.error('Error getting user knowledge:', error);
            throw error;
        }
    }

    // ===== FAVORITES CRUD OPERATIONS =====

    /**
     * Save user favorites
     */
    async saveUserFavorites(userId, favoritesData) {
        try {
            const query = `
                INSERT INTO user_favorites (user_id, favorites_data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    favorites_data = $2,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const result = await this.db.query(query, [
                userId,
                JSON.stringify(favoritesData)
            ]);

            const favorites = result.rows[0];
            favorites.favorites_data = typeof favorites.favorites_data === 'string' 
                ? JSON.parse(favorites.favorites_data) 
                : favorites.favorites_data;
            
            return favorites;
        } catch (error) {
            console.error('Error saving user favorites:', error);
            throw error;
        }
    }

    /**
     * Get user favorites
     */
    async getUserFavorites(userId) {
        try {
            const query = 'SELECT * FROM user_favorites WHERE user_id = $1';
            const result = await this.db.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const favorites = result.rows[0];
            favorites.favorites_data = typeof favorites.favorites_data === 'string' 
                ? JSON.parse(favorites.favorites_data) 
                : favorites.favorites_data;
            
            return favorites;
        } catch (error) {
            console.error('Error getting user favorites:', error);
            throw error;
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get active session for user
     */
    async getActiveSession(userId) {
        try {
            const query = `
                SELECT s.*, 
                       json_agg(
                           json_build_object(
                               'id', i.id,
                               'iteration_number', i.iteration_number,
                               'start_time', i.start_time,
                               'end_time', i.end_time,
                               'status', i.status,
                               'data', i.data,
                               'created_at', i.created_at
                           ) ORDER BY i.iteration_number
                       ) FILTER (WHERE i.id IS NOT NULL) as iterations
                FROM sessions s
                LEFT JOIN iterations i ON s.id = i.session_id
                WHERE s.user_id = $1 AND s.status IN ('active', 'paused')
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT 1
            `;
            
            const result = await this.db.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            session.metadata = typeof session.metadata === 'string' 
                ? JSON.parse(session.metadata) 
                : session.metadata;
            session.iterations = session.iterations || [];
            
            return session;
        } catch (error) {
            console.error('Error getting active session:', error);
            throw error;
        }
    }

    /**
     * Get recent completed sessions
     */
    async getRecentCompletedSessions(userId, limit = 10) {
        try {
            const query = `
                SELECT s.*, 
                       COUNT(i.id) as iteration_count,
                       MAX(i.end_time) as last_iteration_time
                FROM sessions s
                LEFT JOIN iterations i ON s.id = i.session_id
                WHERE s.user_id = $1 AND s.status = 'completed'
                GROUP BY s.id
                ORDER BY s.end_time DESC
                LIMIT $2
            `;
            
            const result = await this.db.query(query, [userId, limit]);
            
            return result.rows.map(session => ({
                ...session,
                metadata: typeof session.metadata === 'string' 
                    ? JSON.parse(session.metadata) 
                    : session.metadata
            }));
        } catch (error) {
            console.error('Error getting recent completed sessions:', error);
            throw error;
        }
    }

    /**
     * Mark session as discarded
     */
    async discardSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'discarded',
                end_time: new Date()
            });
        } catch (error) {
            console.error('Error discarding session:', error);
            throw error;
        }
    }

    /**
     * Complete session
     */
    async completeSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'completed',
                end_time: new Date()
            });
        } catch (error) {
            console.error('Error completing session:', error);
            throw error;
        }
    }

    /**
     * Pause session
     */
    async pauseSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'paused'
            });
        } catch (error) {
            console.error('Error pausing session:', error);
            throw error;
        }
    }

    /**
     * Resume session
     */
    async resumeSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'active'
            });
        } catch (error) {
            console.error('Error resuming session:', error);
            throw error;
        }
    }

    /**
     * Get session statistics
     */
    async getSessionStats(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
                    COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_sessions,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_session_minutes
                FROM sessions 
                WHERE user_id = $1
            `;
            
            const result = await this.db.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting session stats:', error);
            throw error;
        }
    }
}

module.exports = DatabaseSessionManager;
