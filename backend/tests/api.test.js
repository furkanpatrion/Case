process.env.NODE_ENV = 'test';
const request = require('supertest');
const { app, httpServer } = require('../index');

const prisma = require('../src/config/db');
const { client: mqttClient } = require('../src/services/mqttService');

describe('API Endpoints', () => {
    // Correctly close resources after all tests have finished
    afterAll(async () => {
        // Close database connection
        await prisma.$disconnect();

        // Close MQTT connection if it's open
        if (mqttClient && mqttClient.connected) {
            await new Promise((resolve) => mqttClient.end(false, resolve));
        }

        // Close server handles
        await new Promise((resolve) => httpServer.close(resolve));
    });


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

            // Should fail due to validation or error 400
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
        describe('Admin Analytics', () => {
            it('should return 401 for analytics without token', async () => {
                const res = await request(app).get('/api/admin/stats/behavior-analytics');
                expect(res.statusCode).toEqual(401);
            });
        });
    });
});


