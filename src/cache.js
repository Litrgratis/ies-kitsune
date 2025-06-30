/**
 * Response Caching System for API Optimization
 * Reduces API calls and costs by caching similar responses
 */

import crypto from 'crypto';

class ResponseCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 30 * 60 * 1000; // 30 minutes default
        this.hitCount = 0;
        this.missCount = 0;
        this.enabled = options.enabled !== false;
        
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Generate cache key from request parameters
     */
    generateKey(builder, topic, prompt, options = {}) {
        const keyData = {
            builder,
            topic: topic.toLowerCase().trim(),
            prompt: prompt.toLowerCase().trim(),
            model: options.model || 'default',
            temperature: options.temperature || 0.7
        };
        
        const keyString = JSON.stringify(keyData);
        return crypto.createHash('md5').update(keyString).digest('hex');
    }

    /**
     * Get cached response if available and not expired
     */
    get(builder, topic, prompt, options = {}) {
        if (!this.enabled) return null;

        const key = this.generateKey(builder, topic, prompt, options);
        const cached = this.cache.get(key);
        
        if (!cached) {
            this.missCount++;
            return null;
        }
        
        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }
        
        this.hitCount++;
        console.log(`🎯 Cache HIT for ${builder} (${this.getHitRatio()}% hit rate)`);
        
        // Return a copy with cache metadata
        return {
            ...cached.response,
            cached: true,
            cachedAt: cached.cachedAt,
            fromCache: true
        };
    }

    /**
     * Store response in cache
     */
    set(builder, topic, prompt, response, options = {}) {
        if (!this.enabled) return;

        const key = this.generateKey(builder, topic, prompt, options);
        
        // Don't cache error responses or very short responses
        if (response.error || (response.response && response.response.length < 50)) {
            return;
        }
        
        // Make room if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        const cacheEntry = {
            response: { ...response },
            cachedAt: Date.now(),
            expiresAt: Date.now() + this.ttl,
            key,
            builder,
            size: JSON.stringify(response).length
        };
        
        this.cache.set(key, cacheEntry);
        console.log(`💾 Cached response for ${builder} (${this.cache.size}/${this.maxSize})`);
    }

    /**
     * Remove oldest cache entries
     */
    evictOldest() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
        
        // Remove oldest 10%
        const toRemove = Math.ceil(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                removed++;
            }
        }
        
        if (removed > 0) {
            console.log(`🧹 Cleaned ${removed} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.hitCount + this.missCount;
        return {
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRatio: this.getHitRatio(),
            totalRequests,
            cacheSize: this.cache.size,
            maxSize: this.maxSize,
            enabled: this.enabled
        };
    }

    /**
     * Get hit ratio percentage
     */
    getHitRatio() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? Math.round((this.hitCount / total) * 100) : 0;
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        console.log('🗑️ Cache cleared');
    }

    /**
     * Disable caching
     */
    disable() {
        this.enabled = false;
        console.log('⏸️ Caching disabled');
    }

    /**
     * Enable caching
     */
    enable() {
        this.enabled = true;
        console.log('▶️ Caching enabled');
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Global cache instance
export const responseCache = new ResponseCache({
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    ttl: parseInt(process.env.CACHE_TTL) || 30 * 60 * 1000,
    enabled: process.env.ENABLE_CACHE !== 'false'
});

export default ResponseCache;
