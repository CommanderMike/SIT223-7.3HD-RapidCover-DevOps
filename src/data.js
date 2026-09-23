const guards = [
    {
        id: 1,
        name: 'James K.',
        available: true,
        licensed: true,
        distanceKm: 4,
        reliability: 95
    },
    {
        id: 2,
        name: 'Priya S.',
        available: true,
        licensed: true,
        distanceKm: 7,
        reliability: 90
    },
    {
        id: 3,
        name: 'Daniel M.',
        available: true,
        licensed: true,
        distanceKm: 9,
        reliability: 84
    },
    {
        id: 4,
        name: 'Alex R.',
        available: false,
        licensed: true,
        distanceKm: 2,
        reliability: 97
    }
];

const shifts = [];

function resetShifts() {
    shifts.splice(
        0,
        shifts.length,
        {
            id: 1,
            location: 'Melbourne CBD',
            requiredLicence: true,
            status: 'vacant',
            replacementGuardId: null
        }
    );
}

resetShifts();

module.exports = {
    guards,
    shifts,
    resetShifts
};