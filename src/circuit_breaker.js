/**
 * Circuit Breaker Pattern Implementation
 * Chroni API przed przeciążeniem poprzez automatyczne otwieranie obwodu po failures
 */

export class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.recoveryTimeout = options.recoveryTimeout || 60000; // 60s
        this.monitoringPeriod = options.monitoringPeriod || 10000; // 10s
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            averageResponseTime: 0,
            stateChanges: []
        };
    }

    /**
     * Sprawdza czy obwód jest otwarty
     */
    isOpen() {
        if (this.state === 'OPEN') {
            // Sprawdź czy można przejść do HALF_OPEN
            if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
                this.setState('HALF_OPEN');
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Rejestruje udane wywołanie
     */
    recordSuccess() {
        this.failureCount = 0;
        this.successCount++;
        this.stats.totalSuccesses++;
        this.stats.totalRequests++;

        if (this.state === 'HALF_OPEN') {
            // Po sukcesie w HALF_OPEN, zamknij obwód
            this.setState('CLOSED');
        }
    }

    /**
     * Rejestruje nieudane wywołanie
     */
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.stats.totalFailures++;
        this.stats.totalRequests++;

        if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
            this.setState('OPEN');
        } else if (this.state === 'HALF_OPEN') {
            // Failure w HALF_OPEN -> z powrotem do OPEN
            this.setState('OPEN');
        }
    }

    /**
     * Zmienia stan obwodu
     */
    setState(newState) {
        const previousState = this.state;
        this.state = newState;
        
        this.stats.stateChanges.push({
            from: previousState,
            to: newState,
            timestamp: Date.now(),
            failureCount: this.failureCount
        });

        console.log(`🔧 Circuit Breaker: ${previousState} -> ${newState} (failures: ${this.failureCount})`);
    }

    /**
     * Pobiera aktualny status
     */
    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            isOpen: this.isOpen(),
            stats: this.stats,
            healthScore: this.calculateHealthScore()
        };
    }

    /**
     * Oblicza wskaźnik "zdrowia" API (0-100)
     */
    calculateHealthScore() {
        if (this.stats.totalRequests === 0) return 100;
        
        const successRate = (this.stats.totalSuccesses / this.stats.totalRequests) * 100;
        const stateBonus = this.state === 'CLOSED' ? 0 : -20;
        
        return Math.max(0, Math.min(100, successRate + stateBonus));
    }

    /**
     * Resetuje statistyki
     */
    reset() {
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.setState('CLOSED');
        
        this.stats = {
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            averageResponseTime: 0,
            stateChanges: []
        };
    }

    /**
     * Async wrapper dla funkcji - automatyczne zarządzanie Circuit Breaker
     */
    async execute(asyncFunction, ...args) {
        if (this.isOpen()) {
            throw new Error(`Circuit breaker is OPEN. Last failure: ${this.lastFailureTime}`);
        }

        const startTime = Date.now();
        
        try {
            const result = await asyncFunction(...args);
            this.recordSuccess();
            
            // Update response time stats
            const responseTime = Date.now() - startTime;
            this.updateResponseTime(responseTime);
            
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Aktualizuje średni czas odpowiedzi
     */
    updateResponseTime(responseTime) {
        const total = this.stats.averageResponseTime * (this.stats.totalRequests - 1);
        this.stats.averageResponseTime = (total + responseTime) / this.stats.totalRequests;
    }
}

/**
 * Singleton instance dla głównego API
 */
export const apiCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30s dla szybszego recovery w dev
    monitoringPeriod: 5000   // 5s monitoring
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.circuitBreaker = apiCircuitBreaker;
}
