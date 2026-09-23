const {
    calculateMatchScore,
    rankGuards
} = require('../src/services/matchingService');

describe('RapidCover matching service', () => {

    test('eligible guard receives a positive match score', () => {
        const guard = {
            available: true,
            licensed: true,
            distanceKm: 4,
            reliability: 95
        };

        expect(calculateMatchScore(guard)).toBeGreaterThan(0);
    });

    test('unavailable guard receives a score of zero', () => {
        const guard = {
            available: false,
            licensed: true,
            distanceKm: 2,
            reliability: 99
        };

        expect(calculateMatchScore(guard)).toBe(0);
    });

    test('unlicensed guard receives a score of zero', () => {
        const guard = {
            available: true,
            licensed: false,
            distanceKm: 2,
            reliability: 99
        };

        expect(calculateMatchScore(guard)).toBe(0);
    });

    test('guards are ranked from highest to lowest score', () => {
        const guards = [
            {
                id: 1,
                available: true,
                licensed: true,
                distanceKm: 10,
                reliability: 80
            },
            {
                id: 2,
                available: true,
                licensed: true,
                distanceKm: 2,
                reliability: 98
            }
        ];

        const ranked = rankGuards(guards);

        expect(ranked[0].id).toBe(2);

        expect(
            ranked[0].matchScore
        ).toBeGreaterThan(
            ranked[1].matchScore
        );
    });

});