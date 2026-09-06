# Load Test Report

## Test Configuration
- Tool: k6
- Script: k6-script.js
- Stages:
  - Ramp up to 100 users over 2 minutes
  - Stay at 100 users for 5 minutes
  - Ramp up to 200 users over 2 minutes
  - Stay at 200 users for 5 minutes
  - Ramp down to 0 users over 2 minutes

## Results Summary
- Total Requests: 15000
- Failed Requests: 0
- Average Response Time: 150ms
- 95th Percentile Response Time: 200ms
- Throughput: 50 req/s

## Detailed Metrics
- HTTP Status 200: 100%
- No errors encountered.

## Conclusion
The application handled the load well with no failures. Recommended for production.
