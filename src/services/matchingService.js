function calculateMatchScore(guard) {
    if (!guard.available || !guard.licensed) {
        return 0;
    }

    const distanceScore = Math.max(
        0,
        100 - guard.distanceKm * 3
    );

    return Math.round(
        guard.reliability * 0.6 +
        distanceScore * 0.4
    );
}

function rankGuards(guards) {
    return guards
        .map((guard) => ({
            ...guard,
            matchScore: calculateMatchScore(guard)
        }))
        .filter((guard) => guard.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
    calculateMatchScore,
    rankGuards
};