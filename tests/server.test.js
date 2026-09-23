jest.mock('../src/app', () => ({
    listen: jest.fn((port, callback) => {
        callback();
    })
}));

describe('RapidCover server startup', () => {
    test('starts the API server on the configured port', () => {
        const app = require('../src/app');

        require('../src/server');

        expect(app.listen).toHaveBeenCalledWith(
            3000,
            expect.any(Function)
        );
    });
});