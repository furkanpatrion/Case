const request = require('supertest');
const { app } = require('../index');

describe('API Endpoints', () => {
    // Before all tests, we can set NODE_ENV to test
    process.env.NODE_ENV = 'test';

    describe('Health Check', () => {
        it('should return 200 OK', async () => {
            const res = await request(app).get('/api/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('status', 'OK');
        });
    });

    describe('Authentication', () => {
        it('should fail to register with invalid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: '123'
                });

            // Should fail due to validation or error
            expect(res.statusCode).not.toEqual(201);
        });

        it('should return 401 for login with wrong credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });
    });

    describe('Protected Routes', () => {
        it('should return 401 when accessing profile without token', async () => {
            const res = await request(app).get('/api/auth/profile');
            expect(res.statusCode).toEqual(401);
        });
    });
});
