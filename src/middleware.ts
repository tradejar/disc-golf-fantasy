import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — accessible without signing in
const isPublicRoute = createRouteMatcher([
    '/',
    '/rules',
    '/privacy',
    '/leaderboard(.*)',
    '/api/leaderboard(.*)',
    '/api/live-status(.*)',
    '/api/player-stats(.*)',        // Landing page previous tournament ticker
    '/api/tournament-results(.*)',  // Landing page previous tournament winners
    '/api/weather(.*)',             // Landing page weather ticker
    '/api/cron(.*)',           // Cron endpoints — protected by CRON_SECRET, not Clerk
    '/api/registered-players(.*)', // Used by draft page before auth resolves
]);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
