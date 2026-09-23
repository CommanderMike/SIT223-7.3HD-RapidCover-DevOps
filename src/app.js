const express = require('express');

const {
    guards,
    shifts
} = require('./data');

const {
    rankGuards,
    calculateMatchScore
} = require('./services/matchingService');

const app = express();

app.disable('x-powered-by');

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'RapidCover API'
    });
});

app.get('/api/guards', (req, res) => {
    res.status(200).json(guards);
});

app.get('/api/shifts', (req, res) => {
    res.status(200).json(shifts);
});

app.post('/api/shifts/:id/match', (req, res) => {
    const shiftId = Number(req.params.id);

    const shift = shifts.find(
        (item) => item.id === shiftId
    );

    if (!shift) {
        return res.status(404).json({
            error: 'Shift not found'
        });
    }

    if (shift.status !== 'vacant') {
        return res.status(409).json({
            error: 'Shift is no longer vacant'
        });
    }

    const rankedGuards = rankGuards(guards);

    return res.status(200).json({
        shift,
        matches: rankedGuards.slice(0, 3)
    });
});

app.post('/api/shifts/:id/accept', (req, res) => {
    const shiftId = Number(req.params.id);
    const guardId = Number(req.body.guardId);

    const shift = shifts.find(
        (item) => item.id === shiftId
    );

    if (!shift) {
        return res.status(404).json({
            error: 'Shift not found'
        });
    }

    if (shift.status !== 'vacant') {
        return res.status(409).json({
            error: 'Shift is no longer vacant'
        });
    }

    const guard = guards.find(
        (item) => item.id === guardId
    );

    if (!guard) {
        return res.status(404).json({
            error: 'Guard not found'
        });
    }

    if (calculateMatchScore(guard) === 0) {
        return res.status(400).json({
            error: 'Guard is not eligible for this shift'
        });
    }

    shift.status = 'confirmed';
    shift.replacementGuardId = guard.id;

    return res.status(200).json({
        message: 'Replacement confirmed',
        shift,
        guard
    });
});

module.exports = app;