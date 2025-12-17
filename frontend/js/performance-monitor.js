// frontend/js/performance-monitor.js
class PerformanceMonitor {
    static logMetrics() {
        window.addEventListener('load', () => {
            const perf = window.performance.timing;
            const pageLoadTime = perf.loadEventEnd - perf.navigationStart;
            const connectTime = perf.responseEnd - perf.requestStart;
            const renderTime = perf.domComplete - perf.domLoading;

            console.log(`
        ⏱️ PAGE LOAD TIME: ${pageLoadTime}ms
        📡 SERVER RESPONSE: ${connectTime}ms
        🎨 DOM RENDER: ${renderTime}ms
      `);

            // Optional: An Backend senden
            fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageLoadTime,
                    connectTime,
                    renderTime,
                    timestamp: new Date()
                })
            }).catch(() => { }); // Fehler ignorieren
        });
    }
}

PerformanceMonitor.logMetrics();
