"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelShell = parallelShell;
const p_queue_1 = require("p-queue");
const aws_1 = require("../aws");
const corking_1 = require("../corking");
/**
 * Run a function in parallel with cached output
 */
async function parallelShell(inputs, block, swallowError) {
    // Limit to 10 for now, too many instances of Maven exhaust the CodeBuild instance memory
    const q = new p_queue_1.default({ concurrency: Number(process.env.CONCURRENCY) || 10 });
    await q.addAll(inputs.map(input => async () => {
        let attempts = 10;
        let sleepMs = 500;
        while (true) {
            const output = new corking_1.MemoryStream();
            try {
                await block(input, output);
                return;
            }
            catch (e) {
                switch (swallowError?.(input, output.toString())) {
                    case 'skip':
                        return;
                    case 'retry':
                        if (--attempts > 0) {
                            await (0, aws_1.sleep)(Math.floor(Math.random() * sleepMs));
                            sleepMs *= 2;
                            continue;
                        }
                        break;
                    case 'fail':
                    case undefined:
                        break;
                }
                // eslint-disable-next-line no-console
                console.error(output.toString());
                throw e;
            }
        }
    }));
    await q.onEmpty();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYWxsZWwtc2hlbGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwYXJhbGxlbC1zaGVsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVNBLHNDQXlDQztBQWxERCxxQ0FBNkI7QUFDN0IsZ0NBQStCO0FBQy9CLHdDQUEwQztBQUkxQzs7R0FFRztBQUNJLEtBQUssVUFBVSxhQUFhLENBQ2pDLE1BQVcsRUFDWCxLQUE2RCxFQUM3RCxZQUFzRDtJQUV0RCx5RkFBeUY7SUFDekYsTUFBTSxDQUFDLEdBQUcsSUFBSSxpQkFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0UsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUM1QyxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbEIsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDWixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFZLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQixPQUFPO1lBQ1QsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1gsUUFBUSxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDakQsS0FBSyxNQUFNO3dCQUNULE9BQU87b0JBRVQsS0FBSyxPQUFPO3dCQUNWLElBQUksRUFBRSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ25CLE1BQU0sSUFBQSxXQUFLLEVBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQzs0QkFDakQsT0FBTyxJQUFJLENBQUMsQ0FBQzs0QkFDYixTQUFTO3dCQUNYLENBQUM7d0JBQ0QsTUFBTTtvQkFFUixLQUFLLE1BQU0sQ0FBQztvQkFDWixLQUFLLFNBQVM7d0JBQ1osTUFBTTtnQkFDVixDQUFDO2dCQUVELHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDakMsTUFBTSxDQUFDLENBQUM7WUFDVixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFSixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBRdWV1ZSBmcm9tICdwLXF1ZXVlJztcbmltcG9ydCB7IHNsZWVwIH0gZnJvbSAnLi4vYXdzJztcbmltcG9ydCB7IE1lbW9yeVN0cmVhbSB9IGZyb20gJy4uL2NvcmtpbmcnO1xuXG5leHBvcnQgdHlwZSBFcnJvclJlc3BvbnNlID0gJ2ZhaWwnIHwgJ3NraXAnIHwgJ3JldHJ5JztcblxuLyoqXG4gKiBSdW4gYSBmdW5jdGlvbiBpbiBwYXJhbGxlbCB3aXRoIGNhY2hlZCBvdXRwdXRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhcmFsbGVsU2hlbGw8QT4oXG4gIGlucHV0czogQVtdLFxuICBibG9jazogKHg6IEEsIG91dHB1dDogTm9kZUpTLldyaXRhYmxlU3RyZWFtKSA9PiBQcm9taXNlPHZvaWQ+LFxuICBzd2FsbG93RXJyb3I/OiAoeDogQSwgb3V0cHV0OiBzdHJpbmcpID0+IEVycm9yUmVzcG9uc2UsXG4pIHtcbiAgLy8gTGltaXQgdG8gMTAgZm9yIG5vdywgdG9vIG1hbnkgaW5zdGFuY2VzIG9mIE1hdmVuIGV4aGF1c3QgdGhlIENvZGVCdWlsZCBpbnN0YW5jZSBtZW1vcnlcbiAgY29uc3QgcSA9IG5ldyBQUXVldWUoeyBjb25jdXJyZW5jeTogTnVtYmVyKHByb2Nlc3MuZW52LkNPTkNVUlJFTkNZKSB8fCAxMCB9KTtcbiAgYXdhaXQgcS5hZGRBbGwoaW5wdXRzLm1hcChpbnB1dCA9PiBhc3luYyAoKSA9PiB7XG4gICAgbGV0IGF0dGVtcHRzID0gMTA7XG4gICAgbGV0IHNsZWVwTXMgPSA1MDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IG91dHB1dCA9IG5ldyBNZW1vcnlTdHJlYW0oKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGJsb2NrKGlucHV0LCBvdXRwdXQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHN3aXRjaCAoc3dhbGxvd0Vycm9yPy4oaW5wdXQsIG91dHB1dC50b1N0cmluZygpKSkge1xuICAgICAgICAgIGNhc2UgJ3NraXAnOlxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgY2FzZSAncmV0cnknOlxuICAgICAgICAgICAgaWYgKC0tYXR0ZW1wdHMgPiAwKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHNsZWVwKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHNsZWVwTXMpKTtcbiAgICAgICAgICAgICAgc2xlZXBNcyAqPSAyO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSAnZmFpbCc6XG4gICAgICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3Iob3V0cHV0LnRvU3RyaW5nKCkpO1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfSkpO1xuXG4gIGF3YWl0IHEub25FbXB0eSgpO1xufVxuIl19