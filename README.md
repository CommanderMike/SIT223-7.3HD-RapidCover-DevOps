# SIT223 7.3HD - RapidCover DevOps Pipeline

RapidCover is a prototype emergency security guard replacement API developed for SIT223.

## Core functionality

- Detect vacant security shifts
- Rank suitable replacement guards
- Check guard eligibility
- Accept replacement shifts
- Confirm replacement coverage
- Provide a health-check endpoint

## Technology Stack

- Node.js
- Express.js
- Jest
- Supertest
- Jenkins

## Testing

Run all unit and integration tests:

npm test

Run tests with coverage:

npm run test:coverage

The project currently uses automated coverage thresholds to prevent insufficiently tested code from passing the testing stage.