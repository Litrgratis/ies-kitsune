export async function callAPI(builder, topic, prompt, circuitBreaker) {
    if (circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open');
    }
    try {
        const response = await fetch('/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ builder, topic, prompt })
        });
        if (response.status === 429) {
            circuitBreaker.recordFailure();
            throw new Error('Rate limit exceeded');
        }
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        circuitBreaker.recordSuccess();
        return await response.json();
    } catch (error) {
        circuitBreaker.recordFailure();
        console.error(`API call failed for ${builder}:`, error);
        throw error;
    }
}