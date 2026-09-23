const request = require('supertest');

const app = require('../src/app');

const {
    resetShifts
} = require('../src/data');

beforeEach(() => {
    resetShifts();
});

describe('RapidCover API integration tests', () => {
    test('health endpoint reports service as healthy', async () => {
        const response = await request(app)
            .get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    test('vacant shift returns ranked replacement matches', async () => {
        const response = await request(app)
            .post('/api/shifts/1/match');

        expect(response.statusCode).toBe(200);

        expect(
            response.body.matches.length
        ).toBeGreaterThan(0);

        expect(
            response.body.matches[0].matchScore
        ).toBeGreaterThanOrEqual(
            response.body.matches[1].matchScore
        );
    });

    test('eligible guard can accept a vacant shift', async () => {
        const response = await request(app)
            .post('/api/shifts/1/accept')
            .send({
                guardId: 1
            });

        expect(response.statusCode).toBe(200);

        expect(
            response.body.shift.status
        ).toBe('confirmed');

        expect(
            response.body.shift.replacementGuardId
        ).toBe(1);
    });

    test('unavailable guard cannot accept a shift', async () => {
        const response = await request(app)
            .post('/api/shifts/1/accept')
            .send({
                guardId: 4
            });

        expect(response.statusCode).toBe(400);
    });

    test('guards endpoint returns available guard data', async () => {
    const response = await request(app)
        .get('/api/guards');

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
});

test('shifts endpoint returns shift data', async () => {
    const response = await request(app)
        .get('/api/shifts');

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].status).toBe('vacant');
});

test('matching returns 404 when shift does not exist', async () => {
    const response = await request(app)
        .post('/api/shifts/999/match');

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Shift not found');
});

test('matching rejects a shift that is already confirmed', async () => {
    await request(app)
        .post('/api/shifts/1/accept')
        .send({
            guardId: 1
        });

    const response = await request(app)
        .post('/api/shifts/1/match');

    expect(response.statusCode).toBe(409);
    expect(response.body.error)
        .toBe('Shift is no longer vacant');
});

test('accepting a non-existent shift returns 404', async () => {
    const response = await request(app)
        .post('/api/shifts/999/accept')
        .send({
            guardId: 1
        });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Shift not found');
});

test('accepting an already filled shift returns 409', async () => {
    await request(app)
        .post('/api/shifts/1/accept')
        .send({
            guardId: 1
        });

    const response = await request(app)
        .post('/api/shifts/1/accept')
        .send({
            guardId: 2
        });

    expect(response.statusCode).toBe(409);
    expect(response.body.error)
        .toBe('Shift is no longer vacant');
});

    test('unknown guard cannot accept a shift', async () => {
        const response = await request(app)
            .post('/api/shifts/1/accept')
            .send({
                guardId: 999
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Guard not found');
    });
});