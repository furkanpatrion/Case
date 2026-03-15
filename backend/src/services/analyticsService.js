const prisma = require('../config/db');
const dayjs = require('dayjs');

/**
 * Log Analytics Service
 * Provides insights into user behavior and predictive stats.
 */

const getBehaviorAnalytics = async (companyId = null) => {
    const last7Days = dayjs().subtract(7, 'day').toDate();

    // 1. Fetching base logs for analysis
    const logs = await prisma.userActivity.findMany({
        where: {
            timestamp: { gte: last7Days },
            ...(companyId ? { user: { companyId } } : {})
        },
        include: { user: true }
    });

    if (logs.length === 0) return { message: 'Insufficient data for analytics' };

    // 2. Heatmap: Activity by hour of the day
    const heatmap = Array(24).fill(0);
    logs.forEach(log => {
        const hour = dayjs(log.timestamp).hour();
        heatmap[hour]++;
    });

    // 3. Most common actions
    const actionCounts = {};
    logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

    // 4. Predictive: Estimated activity for next 24 hours
    // Simple logic: Calculate daily average of last 7 days and apply a trend factor
    const dailyCounts = {};
    logs.forEach(log => {
        const day = dayjs(log.timestamp).format('YYYY-MM-DD');
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    const avgDailyActivity = counts.reduce((a, b) => a + b, 0) / 7;

    // Trend analysis (Simple linear logic: check if activity is increasing)
    const firstHalf = counts.slice(0, 3).reduce((a, b) => a + b, 0) / 3 || 1;
    const secondHalf = counts.slice(-3).reduce((a, b) => a + b, 0) / 3 || 1;
    const growthFactor = secondHalf / firstHalf;

    const forecastedNext24h = Math.round(avgDailyActivity * growthFactor);

    // 5. User Retention / Stickness (Unique active users over time)
    const activeUsersPerDay = {};
    logs.forEach(log => {
        const day = dayjs(log.timestamp).format('YYYY-MM-DD');
        if (!activeUsersPerDay[day]) activeUsersPerDay[day] = new Set();
        activeUsersPerDay[day].add(log.userId);
    });
    const retentionData = Object.entries(activeUsersPerDay).map(([day, users]) => ({
        day,
        uniqueUsers: users.size
    }));

    return {
        summary: {
            totalLogs7d: logs.length,
            avgDailyActivity: Math.round(avgDailyActivity),
            forecastedNext24h,
            trend: growthFactor > 1.1 ? 'INCREASING' : (growthFactor < 0.9 ? 'DECREASING' : 'STABLE')
        },
        heatmap,
        topActions,
        retentionData
    };
};

module.exports = { getBehaviorAnalytics };
