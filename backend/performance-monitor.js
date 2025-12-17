#!/usr/bin/env node

/**
 * 🎵 SONG-NEXUS Performance Monitor
 * Misst: API Response Times, DB Query Times, Memory, CPU
 * Output: performance-report.json
 * 
 * BACKEND Node.js Version (NICHT Browser!)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// ⚙️ CONFIGURATION
// ============================================================================

const API_BASE = 'https://localhost:3000/api';
const FRONTEND_BASE = 'https://localhost:5500';
const ITERATIONS = 10; // Run each test 10 times
const REPORT_FILE = path.join(__dirname, 'performance-report.json');

// Disable SSL cert verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ============================================================================
// 📊 PERFORMANCE METRICS
// ============================================================================

const metrics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        memory_total_gb: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
        memory_free_gb: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
    },
    tests: {},
    summary: {}
};

// ============================================================================
// 🔧 HTTP REQUEST HELPER
// ============================================================================

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const opts = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'SONG-NEXUS-Performance-Monitor/1.0',
                ...options.headers
            },
            timeout: 30000
        };

        const req = client.request(opts, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    size: data.length,
                    responseTime,
                    success: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// ============================================================================
// 📈 TEST FUNCTIONS
// ============================================================================

async function testTracksAPI() {
    console.log('\n🎵 Testing /api/tracks endpoint...');
    const results = [];

    for (let i = 0; i < ITERATIONS; i++) {
        try {
            const result = await makeRequest(`${API_BASE}/tracks?page=1&limit=12`);
            results.push(result);
            console.log(`  ✅ Iteration ${i + 1}: ${result.responseTime}ms`);
        } catch (err) {
            console.error(`  ❌ Iteration ${i + 1}: ${err.message}`);
            results.push({ error: err.message });
        }
    }

    return {
        endpoint: '/api/tracks',
        iterations: ITERATIONS,
        results,
        avgResponseTime: Math.round(
            results
                .filter(r => r.responseTime)
                .reduce((a, b) => a + b.responseTime, 0) / results.filter(r => r.responseTime).length
        ),
        minResponseTime: Math.min(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        maxResponseTime: Math.max(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        successRate: `${Math.round((results.filter(r => r.success).length / results.length) * 100)}%`
    };
}

async function testSingleTrackAPI() {
    console.log('\n🎵 Testing /api/tracks/:id endpoint...');
    const results = [];

    for (let i = 0; i < ITERATIONS; i++) {
        try {
            const result = await makeRequest(`${API_BASE}/tracks/1`);
            results.push(result);
            console.log(`  ✅ Iteration ${i + 1}: ${result.responseTime}ms`);
        } catch (err) {
            console.error(`  ❌ Iteration ${i + 1}: ${err.message}`);
            results.push({ error: err.message });
        }
    }

    return {
        endpoint: '/api/tracks/:id',
        iterations: ITERATIONS,
        results,
        avgResponseTime: Math.round(
            results
                .filter(r => r.responseTime)
                .reduce((a, b) => a + b.responseTime, 0) / results.filter(r => r.responseTime).length
        ),
        minResponseTime: Math.min(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        maxResponseTime: Math.max(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        successRate: `${Math.round((results.filter(r => r.success).length / results.length) * 100)}%`
    };
}

async function testFrontendLoad() {
    console.log('\n🌐 Testing Frontend index.html load...');
    const results = [];

    for (let i = 0; i < ITERATIONS; i++) {
        try {
            const result = await makeRequest(`${FRONTEND_BASE}/`);
            results.push(result);
            console.log(`  ✅ Iteration ${i + 1}: ${result.responseTime}ms (${(result.size / 1024).toFixed(2)} KB)`);
        } catch (err) {
            console.error(`  ❌ Iteration ${i + 1}: ${err.message}`);
            results.push({ error: err.message });
        }
    }

    return {
        endpoint: 'Frontend /',
        iterations: ITERATIONS,
        results,
        avgResponseTime: Math.round(
            results
                .filter(r => r.responseTime)
                .reduce((a, b) => a + b.responseTime, 0) / results.filter(r => r.responseTime).length
        ),
        minResponseTime: Math.min(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        maxResponseTime: Math.max(...results.filter(r => r.responseTime).map(r => r.responseTime)),
        avgSize: Math.round(
            results.filter(r => r.size).reduce((a, b) => a + b.size, 0) / results.filter(r => r.size).length
        ),
        successRate: `${Math.round((results.filter(r => r.success).length / results.length) * 100)}%`
    };
}

async function testMemoryUsage() {
    console.log('\n💾 Measuring Memory Usage...');

    const before = process.memoryUsage();

    // Make 5 API calls to stress test
    for (let i = 0; i < 5; i++) {
        try {
            await makeRequest(`${API_BASE}/tracks?page=1&limit=50`);
        } catch (err) {
            console.error(`  ⚠️ Error: ${err.message}`);
        }
    }

    const after = process.memoryUsage();

    return {
        before: {
            heapUsed_mb: (before.heapUsed / 1024 / 1024).toFixed(2),
            heapTotal_mb: (before.heapTotal / 1024 / 1024).toFixed(2),
            rss_mb: (before.rss / 1024 / 1024).toFixed(2)
        },
        after: {
            heapUsed_mb: (after.heapUsed / 1024 / 1024).toFixed(2),
            heapTotal_mb: (after.heapTotal / 1024 / 1024).toFixed(2),
            rss_mb: (after.rss / 1024 / 1024).toFixed(2)
        },
        delta: {
            heapUsed_mb: ((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2),
            heapTotal_mb: ((after.heapTotal - before.heapTotal) / 1024 / 1024).toFixed(2),
            rss_mb: ((after.rss - before.rss) / 1024 / 1024).toFixed(2)
        }
    };
}

// ============================================================================
// 🚀 RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🎵 SONG-NEXUS Performance Monitor        ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n⏱️  Starting tests at ${new Date().toISOString()}`);
    console.log(`📊 Running ${ITERATIONS} iterations per test\n`);

    try {
        metrics.tests.tracks_list = await testTracksAPI();
        metrics.tests.tracks_single = await testSingleTrackAPI();
        metrics.tests.frontend = await testFrontendLoad();
        metrics.tests.memory = await testMemoryUsage();

        // ============================================================================
        // 📈 SUMMARY & ANALYSIS
        // ============================================================================

        metrics.summary = {
            fastest_endpoint: metrics.tests.tracks_single.avgResponseTime < metrics.tests.tracks_list.avgResponseTime
                ? '/api/tracks/:id'
                : '/api/tracks',
            slowest_endpoint: metrics.tests.tracks_single.avgResponseTime > metrics.tests.tracks_list.avgResponseTime
                ? '/api/tracks/:id'
                : '/api/tracks',
            avg_api_response_time_ms: Math.round(
                (metrics.tests.tracks_list.avgResponseTime + metrics.tests.tracks_single.avgResponseTime) / 2
            ),
            frontend_load_time_ms: metrics.tests.frontend.avgResponseTime,
            memory_delta_mb: parseFloat(metrics.tests.memory.delta.heapUsed_mb),
            all_tests_successful:
                metrics.tests.tracks_list.successRate === '100%' &&
                metrics.tests.tracks_single.successRate === '100%' &&
                metrics.tests.frontend.successRate === '100%'
        };

        // ============================================================================
        // 💾 SAVE REPORT
        // ============================================================================

        fs.writeFileSync(REPORT_FILE, JSON.stringify(metrics, null, 2));
        console.log(`\n✅ Report saved to: ${REPORT_FILE}`);

        // ============================================================================
        // 📊 PRINT SUMMARY
        // ============================================================================

        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║          📊 PERFORMANCE SUMMARY            ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log(`\n🎵 API Endpoints:`);
        console.log(`   /api/tracks avg: ${metrics.tests.tracks_list.avgResponseTime}ms (${metrics.tests.tracks_list.successRate})`);
        console.log(`   /api/tracks/:id avg: ${metrics.tests.tracks_single.avgResponseTime}ms (${metrics.tests.tracks_single.successRate})`);
        console.log(`\n🌐 Frontend:`);
        console.log(`   index.html avg: ${metrics.tests.frontend.avgResponseTime}ms (${metrics.tests.frontend.successRate})`);
        console.log(`\n💾 Memory:`);
        console.log(`   Before: ${metrics.tests.memory.before.heapUsed_mb} MB`);
        console.log(`   After: ${metrics.tests.memory.after.heapUsed_mb} MB`);
        console.log(`   Delta: ${metrics.tests.memory.delta.heapUsed_mb} MB`);
        console.log(`\n🎯 Overall:`);
        console.log(`   Status: ${metrics.summary.all_tests_successful ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}`);
        console.log(`   Average Response Time: ${metrics.summary.avg_api_response_time_ms}ms`);

    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    }

    process.exit(0);
}

// Run tests
runAllTests();