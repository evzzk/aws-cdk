"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const github_1 = require("../github");
async function main() {
    const args = await yargs
        .option('token', {
        descripton: 'GitHub token (default: from environment GITHUB_TOKEN)',
        alias: 't',
        type: 'string',
        requiresArg: true,
    })
        .command('last-release', 'Query the last release', cmd => cmd
        .option('prior-to', {
        description: 'Return the most recent release before the given version',
        alias: 'p',
        type: 'string',
        requiresArg: true,
    })
        .option('major', {
        description: 'Return the most recent release that matches',
        alias: 'm',
        type: 'string',
        requiresArg: true,
    }))
        .demandCommand()
        .help()
        .showHelpOnFail(false)
        .argv;
    const command = args._[0];
    const token = args.token ?? process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('Either pass --token or set GITHUB_TOKEN.');
    }
    switch (command) {
        case 'last-release':
            if (args['prior-to'] && args.major) {
                throw new Error('Cannot pass both `--prior-to and --major at the same time');
            }
            // eslint-disable-next-line no-console
            console.log(await (0, github_1.fetchPreviousVersion)(token, {
                priorTo: args['prior-to'],
                majorVersion: args.major,
            }));
            break;
    }
}
main().catch(e => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktZ2l0aHViLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicXVlcnktZ2l0aHViLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLHNDQUFpRDtBQUVqRCxLQUFLLFVBQVUsSUFBSTtJQUNqQixNQUFNLElBQUksR0FBRyxNQUFNLEtBQUs7U0FDckIsTUFBTSxDQUFDLE9BQU8sRUFBRTtRQUNmLFVBQVUsRUFBRSx1REFBdUQ7UUFDbkUsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7U0FDRCxPQUFPLENBQUMsY0FBYyxFQUFFLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRztTQUMxRCxNQUFNLENBQUMsVUFBVSxFQUFFO1FBQ2xCLFdBQVcsRUFBRSx5REFBeUQ7UUFDdEUsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7U0FDRCxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQ2YsV0FBVyxFQUFFLDZDQUE2QztRQUMxRCxLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQyxDQUFDO1NBQ0osYUFBYSxFQUFFO1NBQ2YsSUFBSSxFQUFFO1NBQ04sY0FBYyxDQUFDLEtBQUssQ0FBQztTQUNyQixJQUFJLENBQUM7SUFFUixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTFCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7SUFDckQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxRQUFRLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLEtBQUssY0FBYztZQUNqQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQztZQUMvRSxDQUFDO1lBRUQsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFBLDZCQUFvQixFQUFDLEtBQUssRUFBRTtnQkFDNUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSzthQUN6QixDQUFDLENBQUMsQ0FBQztZQUNKLE1BQU07SUFDVixDQUFDO0FBQ0gsQ0FBQztBQUVELElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNmLHNDQUFzQztJQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgZmV0Y2hQcmV2aW91c1ZlcnNpb24gfSBmcm9tICcuLi9naXRodWInO1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuICBjb25zdCBhcmdzID0gYXdhaXQgeWFyZ3NcbiAgICAub3B0aW9uKCd0b2tlbicsIHtcbiAgICAgIGRlc2NyaXB0b246ICdHaXRIdWIgdG9rZW4gKGRlZmF1bHQ6IGZyb20gZW52aXJvbm1lbnQgR0lUSFVCX1RPS0VOKScsXG4gICAgICBhbGlhczogJ3QnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5jb21tYW5kKCdsYXN0LXJlbGVhc2UnLCAnUXVlcnkgdGhlIGxhc3QgcmVsZWFzZScsIGNtZCA9PiBjbWRcbiAgICAgIC5vcHRpb24oJ3ByaW9yLXRvJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1JldHVybiB0aGUgbW9zdCByZWNlbnQgcmVsZWFzZSBiZWZvcmUgdGhlIGdpdmVuIHZlcnNpb24nLFxuICAgICAgICBhbGlhczogJ3AnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbWFqb3InLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUmV0dXJuIHRoZSBtb3N0IHJlY2VudCByZWxlYXNlIHRoYXQgbWF0Y2hlcycsXG4gICAgICAgIGFsaWFzOiAnbScsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgIH0pKVxuICAgIC5kZW1hbmRDb21tYW5kKClcbiAgICAuaGVscCgpXG4gICAgLnNob3dIZWxwT25GYWlsKGZhbHNlKVxuICAgIC5hcmd2O1xuXG4gIGNvbnN0IGNvbW1hbmQgPSBhcmdzLl9bMF07XG5cbiAgY29uc3QgdG9rZW4gPSBhcmdzLnRva2VuID8/IHByb2Nlc3MuZW52LkdJVEhVQl9UT0tFTjtcbiAgaWYgKCF0b2tlbikge1xuICAgIHRocm93IG5ldyBFcnJvcignRWl0aGVyIHBhc3MgLS10b2tlbiBvciBzZXQgR0lUSFVCX1RPS0VOLicpO1xuICB9XG5cbiAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgY2FzZSAnbGFzdC1yZWxlYXNlJzpcbiAgICAgIGlmIChhcmdzWydwcmlvci10byddICYmIGFyZ3MubWFqb3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcGFzcyBib3RoIGAtLXByaW9yLXRvIGFuZCAtLW1ham9yIGF0IHRoZSBzYW1lIHRpbWUnKTtcbiAgICAgIH1cblxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGF3YWl0IGZldGNoUHJldmlvdXNWZXJzaW9uKHRva2VuLCB7XG4gICAgICAgIHByaW9yVG86IGFyZ3NbJ3ByaW9yLXRvJ10sXG4gICAgICAgIG1ham9yVmVyc2lvbjogYXJncy5tYWpvcixcbiAgICAgIH0pKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbm1haW4oKS5jYXRjaChlID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5lcnJvcihlKTtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG59KTtcbiJdfQ==