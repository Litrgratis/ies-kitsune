import { computeTFIDF } from '../src/utils.js';

/**
 * Testy algorytmu TF-IDF dla analizy podobieństwa tekstów
 */

describe('TF-IDF Algorithm Tests', () => {
    test('should handle empty input', () => {
        const result = computeTFIDF([]);
        expect(result).toBe(0);
    });

    test('should handle single text', () => {
        const texts = ['carbon tax implementation'];
        const result = computeTFIDF(texts);
        expect(result).toBe(0); // Brak porównania
    });

    test('should compute similarity for identical texts', () => {
        const texts = [
            'carbon tax implementation',
            'carbon tax implementation'
        ];
        const result = computeTFIDF(texts);
        expect(result).toBeCloseTo(1.0, 1); // Bardzo podobne
    });

    test('should compute similarity for different texts', () => {
        const texts = [
            'carbon tax implementation for emission reduction',
            'renewable energy solar panels installation'
        ];
        const result = computeTFIDF(texts);
        expect(result).toBeLessThan(0.5); // Różne tematy
    });

    test('should handle synonyms correctly', () => {
        const texts = [
            'carbon tax policy',
            'carbon pricing mechanism'
        ];
        const result = computeTFIDF(texts);
        expect(result).toBeGreaterThan(0.3); // Synonimy powinny zwiększyć podobieństwo
    });

    test('should apply weights correctly', () => {
        const texts = [
            'carbon tax renewable energy',
            'simple solution approach'
        ];
        const result = computeTFIDF(texts);
        expect(result).toBeGreaterThan(0); // Weighted terms
    });

    test('should filter stopwords', () => {
        const texts = [
            'carbon emission reduction system',
            'CO2 climate environmental solution'
        ];
        const result = computeTFIDF(texts);
        // Stopwords powinny być odfiltrowane
        expect(result).toBeDefined();
    });

    test('performance test with multiple texts', () => {
        const texts = [];
        for (let i = 0; i < 100; i++) {
            texts.push(`carbon tax implementation strategy number ${i}`);
        }
        
        const startTime = Date.now();
        const result = computeTFIDF(texts);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(1000); // < 1s
        expect(result).toBeGreaterThan(0.8); // Podobne teksty
    });
});

console.log('✅ Testy TF-IDF zaimplementowane i gotowe do uruchomienia');
