import { selectBuilderRole } from '../src/engine.js';

/**
 * Testy systemu Challenger - mechanizmu wyboru ról AI
 */

describe('Challenger System Tests', () => {
    beforeEach(() => {
        // Reset global state przed każdym testem
        global.challengerForced = false;
    });

    test('should force challenger on iteration 2', () => {
        const role1 = selectBuilderRole(1);
        expect(role1).toBeNull(); // Brak challengera w iteracji 1
        
        const role2 = selectBuilderRole(2);
        expect(role2).toBe('builder2'); // Wymuszony challenger w iteracji 2
    });

    test('should not force challenger twice', () => {
        selectBuilderRole(2); // Pierwszy raz - wymuszony
        const role = selectBuilderRole(2); // Drugi raz - już nie wymuszony
        expect(role).toBeNull(); // Może być null lub builder2 losowo
    });

    test('should have 20% chance for constructive challenger', () => {
        const results = [];
        const iterations = 1000;
        
        // Symuluj 1000 wywołań dla iteracji != 2
        for (let i = 0; i < iterations; i++) {
            global.challengerForced = false; // Reset
            const role = selectBuilderRole(3); // Iteracja != 2
            results.push(role === 'builder2');
        }
        
        const challengerCount = results.filter(r => r).length;
        const percentage = (challengerCount / iterations) * 100;
        
        // Sprawdź czy jest w przedziale 15-25% (z marginesem błędu)
        expect(percentage).toBeGreaterThan(15);
        expect(percentage).toBeLessThan(25);
    });

    test('should return null for most iterations when not forced', () => {
        global.challengerForced = true; // Już wymuszony
        
        const role1 = selectBuilderRole(1);
        const role3 = selectBuilderRole(3);
        const role4 = selectBuilderRole(4);
        
        // Większość powinna być null (80% szans)
        const nullCount = [role1, role3, role4].filter(r => r === null).length;
        expect(nullCount).toBeGreaterThanOrEqual(2); // Co najmniej 2 z 3
    });

    test('should handle edge cases', () => {
        expect(() => selectBuilderRole(0)).not.toThrow();
        expect(() => selectBuilderRole(-1)).not.toThrow();
        expect(() => selectBuilderRole(999)).not.toThrow();
    });

    test('performance test', () => {
        const startTime = Date.now();
        
        for (let i = 0; i < 10000; i++) {
            selectBuilderRole(i);
        }
        
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(100); // < 100ms for 10k calls
    });
});

console.log('✅ Testy Challenger zaimplementowane i gotowe do uruchomienia');
