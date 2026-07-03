<?php

if (!empty($GLOBALS['eternal_love_routes_loaded'])) {
    return;
}

$GLOBALS['eternal_love_routes_loaded'] = true;

use Slim\Routing\RouteCollectorProxy;
use App\Controller\AuthController;
use App\Controller\MembersController;
use App\Controller\EventsController;
use App\Controller\SermonsController;
use App\Controller\BlogController;
use App\Controller\PrayerController;
use App\Controller\GivingController;
use App\Controller\SettingsController;
use App\Controller\ContactController;
use App\Controller\VisitorController;
use App\Controller\AnalyticsController;
use App\Controller\NotificationController;
use App\Controller\ChatController;
use App\Controller\UploadController;
use App\Controller\HomeImagesController;
use App\Controller\DashboardController;
use App\Controller\AttendanceController;
use App\Controller\CellsController;
use App\Controller\ZonesController;
use App\Controller\ZoneLeaderRequestController;
use App\Controller\CellChangeRequestController;
use App\Controller\FollowUpNotesController;
use App\Controller\AbsenceController;
use App\Controller\AnnouncementsController;
use App\Controller\ReportsController;
use App\Controller\FollowUpController;
use App\Controller\SystemController;
use App\Controller\DeveloperApiKeysController;
use App\Controller\FamilyController;
use App\Controller\SpiritualLineageController;
use App\Controller\DisciplesController;
use App\Controller\CareersController;
use App\Middleware\JwtMiddleware;

// Get the app instance from global scope (set in bootstrap.php)
$app = $GLOBALS['app'] ?? null;

// If app is not found, throw clear error
if (!$app) {
    throw new \RuntimeException('App instance not found. Make sure bootstrap.php sets $GLOBALS["app"]');
}

// Public routes (no authentication required)
$app->group('/api', function (RouteCollectorProxy $group) {
    
    // Auth routes
    $group->post('/auth/login', AuthController::class . ':login');
    $group->post('/auth/register', AuthController::class . ':register');
    $group->post('/auth/verify-pin', AuthController::class . ':verifyPin');
    $group->post('/auth/resend-pin', AuthController::class . ':resendPin');
    $group->post('/auth/forgot-password', AuthController::class . ':forgotPassword');
    $group->post('/auth/reset-password', AuthController::class . ':resetPassword');
    $group->post('/auth/refresh-token', AuthController::class . ':refreshToken');
    
    // Public settings
    $group->get('/settings/public', SettingsController::class . ':getPublic');
    
    // Public contact
    $group->post('/contact', ContactController::class . ':submit');
    $group->get('/contact/info', ContactController::class . ':getInfo');
    
    // Public events
    $group->get('/events/public', EventsController::class . ':getPublic');
    
    // Public sermons
    $group->get('/sermons/public', SermonsController::class . ':getPublic');
    $group->get('/sermons/public/{id}', SermonsController::class . ':getPublicOne');
    $group->get('/sermons/series', SermonsController::class . ':getSeries');
    
    // Public blog
    $group->get('/blog/posts', BlogController::class . ':getPublicPosts');
    $group->get('/blog/posts/{slug}', BlogController::class . ':getPublicPost');
    $group->get('/blog/categories', BlogController::class . ':getCategories');
    $group->get('/blog/featured', BlogController::class . ':getFeatured');
    $group->get('/blog/posts/{postId}/comments', BlogController::class . ':getComments');
    $group->post('/blog/posts/{postId}/comments', BlogController::class . ':addComment');
    
    // Public careers
    $group->get('/careers', CareersController::class . ':listPublic');
    $group->post('/careers/apply', CareersController::class . ':apply');

    // Visitors
    $group->post('/visitors', VisitorController::class . ':register');

    // Public analytics/telemetry ingestion
    $group->post('/analytics/pageview', AnalyticsController::class . ':trackPageView');

    // SnapScan webhook
    $group->post('/snapscan/webhook', GivingController::class . ':handleSnapScanWebhook');
    
    // Public giving endpoints (for home page/unauthenticated users)
    $group->get('/giving/funds', GivingController::class . ':getFunds');
    $group->post('/giving/snapscan/create', GivingController::class . ':createSnapScanPayment');
    $group->post('/giving/google-pay', GivingController::class . ':processGooglePay');

    // Public home image reads for homepage and gallery content
    $group->get('/home-images', HomeImagesController::class . ':getAll');
    $group->get('/home-images/section/{section}', HomeImagesController::class . ':getImagesBySection');
    $group->get('/home-images/section/{section}/featured', HomeImagesController::class . ':getFeaturedImages');
    $group->get('/home-images/component/{component}', HomeImagesController::class . ':getImagesByComponent');
    $group->get('/home-images/{id}', HomeImagesController::class . ':getImageById');

    // Frontend utility endpoints
    $group->get('/plans', SystemController::class . ':getPlans');
    $group->post('/error-log', SystemController::class . ':logFrontendError');
    
    // WhatsApp QR page — reads files written by the Node.js service (no HTTP needed)
    $group->get('/wa-qr', function ($request, $response) {
        $base    = '/var/www/vhosts/zenolaunch.co.za/httpdocs/whatsapp-service';
        $status  = trim((string)(@file_get_contents("$base/wa_status.txt") ?: 'waiting'));
        $qrFile  = "$base/wa_qr.png";

        if ($status === 'connected') {
            $body    = '<h2 style="color:#1a7a1a">&#10003; WhatsApp Connected</h2><p>The service is authenticated and ready to send messages.</p>';
            $refresh = '';
        } elseif ($status === 'qr' && file_exists($qrFile)) {
            $png     = file_get_contents($qrFile);
            $img     = 'data:image/png;base64,' . base64_encode($png);
            $body    = '<h2>Scan with WhatsApp</h2>'
                     . '<p>Open WhatsApp &rarr; Settings &rarr; Linked Devices &rarr; Link a Device</p>'
                     . '<img src="' . $img . '" width="300" height="300" style="display:block;margin:20px auto" />'
                     . '<p><small>QR expires after ~60s. Page auto-refreshes every 30s.</small></p>';
            $refresh = '<meta http-equiv="refresh" content="30">';
        } elseif (strpos($status, 'error:') === 0) {
            $body    = '<h2 style="color:red">WhatsApp service error</h2>'
                     . '<p>' . htmlspecialchars($status) . '</p>'
                     . '<p>Check the Node.js logs in Plesk under zenolaunch.co.za &rarr; Node.js.</p>';
            $refresh = '<meta http-equiv="refresh" content="10">';
        } else {
            $body    = '<h2>Waiting for WhatsApp QR...</h2>'
                     . '<p>The service is connecting. This page refreshes every 5 seconds.</p>'
                     . '<p><small>Status: ' . htmlspecialchars($status) . '</small></p>';
            $refresh = '<meta http-equiv="refresh" content="5">';
        }

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>WhatsApp QR</title>' . $refresh . '</head>'
              . '<body style="text-align:center;font-family:sans-serif;padding:40px">' . $body . '</body></html>';

        $response->getBody()->write($html);
        return $response->withHeader('Content-Type', 'text/html; charset=utf-8')->withStatus(200);
    });

    // Health check
    $group->get('/health', function ($request, $response) {
        $response->getBody()->write(json_encode([
            'status' => 'healthy',
            'timestamp' => date('c'),
            'version' => '1.0.0'
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    });

    // Cron triggers — authenticated by X-Cron-Secret header, no JWT needed
    $group->post('/attendance/polls/generate-cron', AttendanceController::class . ':generateMeetingPolls');
    $group->post('/reports/pastoral-report-cron', ReportsController::class . ':mondayPastoralReport');
});

// Non-API root probes and simple metadata endpoints
$app->map(['GET', 'HEAD'], '/', function ($request, $response) {
    $payload = [
        'status' => 'ok',
        'service' => 'eternal-love-church-api',
        'message' => 'API is running',
    ];

    if (strtoupper($request->getMethod()) === 'HEAD') {
        return $response->withStatus(200);
    }

    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

$app->get('/robots.txt', function ($request, $response) {
    $response->getBody()->write("User-agent: *\nDisallow: /\n");
    return $response->withHeader('Content-Type', 'text/plain; charset=utf-8')->withStatus(200);
});

$app->get('/ads.txt', function ($request, $response) {
    return $response->withStatus(204);
});

$app->get('/app-ads.txt', function ($request, $response) {
    return $response->withStatus(204);
});

$app->get('/sellers.json', function ($request, $response) {
    return $response->withStatus(204);
});

// Protected routes (require authentication)
$app->group('/api', function (RouteCollectorProxy $group) {
    
    // Auth
    $group->get('/auth/profile', AuthController::class . ':profile');
    $group->post('/auth/logout', AuthController::class . ':logout');
    $group->post('/auth/change-password', AuthController::class . ':changePassword');
    
    // Members
    $group->get('/members', MembersController::class . ':getAll');
    $group->get('/members/stats', MembersController::class . ':getStats');
    $group->get('/members/search', MembersController::class . ':search');
    $group->get('/members/profile', MembersController::class . ':getProfile');
    $group->put('/members/profile', MembersController::class . ':updateProfile');
    $group->get('/members/{id}/overview', MembersController::class . ':getOverview');
    $group->get('/members/{id}', MembersController::class . ':getOne');
    $group->post('/members', MembersController::class . ':create');
    $group->put('/members/{id}', MembersController::class . ':update');
    $group->patch('/members/{id}/role', MembersController::class . ':updateRole');
    $group->delete('/members/{id}', MembersController::class . ':delete');
    
    // Events
    $group->get('/events', EventsController::class . ':getAll');
    $group->get('/events/stats', EventsController::class . ':getStats');
    $group->get('/events/{id}', EventsController::class . ':getOne');
    $group->post('/events', EventsController::class . ':create');
    $group->put('/events/{id}', EventsController::class . ':update');
    $group->delete('/events/{id}', EventsController::class . ':delete');
    $group->post('/events/{id}/register', EventsController::class . ':register');
    $group->get('/events/{id}/registrations', EventsController::class . ':getRegistrations');
    
    // Sermons
    $group->get('/sermons', SermonsController::class . ':getAll');
    $group->get('/sermons/all', SermonsController::class . ':getAllIncludingUnpublished');
    $group->get('/sermons/drafts', SermonsController::class . ':getDrafts');
    $group->get('/sermons/stats', SermonsController::class . ':getStats');
    $group->get('/sermons/{id}', SermonsController::class . ':getOne');
    $group->post('/sermons', SermonsController::class . ':create');
    $group->put('/sermons/{id}', SermonsController::class . ':update');
    $group->delete('/sermons/{id}', SermonsController::class . ':delete');
    $group->patch('/sermons/{id}/publish', SermonsController::class . ':publish');
    $group->patch('/sermons/{id}/unpublish', SermonsController::class . ':unpublish');
    
    // Blog
    // Note: Public blog routes are defined in the public group above.
    // Protected routes below are for admin/authenticated operations only.
    $group->post('/blog/posts', BlogController::class . ':create');
    $group->get('/blog/admin/posts', BlogController::class . ':getAdminPosts');
    $group->get('/blog/admin/posts/{id}', BlogController::class . ':getAdminPost');
    $group->put('/blog/posts/{id}', BlogController::class . ':update');
    $group->delete('/blog/posts/{id}', BlogController::class . ':delete');
    $group->get('/blog/drafts', BlogController::class . ':getDrafts');
    $group->get('/blog/stats', BlogController::class . ':getStats');
    $group->post('/blog/categories', BlogController::class . ':createCategory');
    $group->get('/blog/search', BlogController::class . ':search');
    $group->post('/blog/posts/{id}/like', BlogController::class . ':likePost');
    $group->post('/blog/comments/{id}/like', BlogController::class . ':likeComment');
    
    // Blog comments (admin/moderation)
    $group->put('/blog/comments/{id}', BlogController::class . ':updateComment');
    $group->delete('/blog/comments/{id}', BlogController::class . ':deleteComment');
    
    // Careers admin CRUD
    $group->get('/admin/careers', CareersController::class . ':listAll');
    $group->post('/admin/careers', CareersController::class . ':create');
    $group->put('/admin/careers/{id}', CareersController::class . ':update');
    $group->delete('/admin/careers/{id}', CareersController::class . ':delete');
    $group->get('/admin/careers/applications', CareersController::class . ':listApplications');
    $group->put('/admin/careers/applications/{id}', CareersController::class . ':updateApplicationStatus');

    // Prayers
    $group->get('/prayers', PrayerController::class . ':getAll');
    $group->get('/prayers/all', PrayerController::class . ':getAllIncludingArchived');
    $group->get('/prayers/stats', PrayerController::class . ':getStats');
    $group->post('/prayers', PrayerController::class . ':submit');
    $group->get('/prayers/{id}', PrayerController::class . ':getOne');
    $group->patch('/prayers/{id}/status', PrayerController::class . ':updateStatus');
    $group->patch('/prayers/{id}/priority', PrayerController::class . ':updatePriority');
    
    // Giving
    $group->get('/giving', GivingController::class . ':getHistory');
    $group->get('/giving/donations', GivingController::class . ':getDonations');
    $group->get('/giving/summary', GivingController::class . ':getSummary');
    $group->get('/giving/reports', GivingController::class . ':getReports');
    $group->get('/giving/sunday-summary', GivingController::class . ':getSundaySummary');
    $group->get('/giving/user-stats', GivingController::class . ':getUserStats');
    $group->get('/giving/user-history', GivingController::class . ':getUserHistory');
    $group->get('/giving/goals', GivingController::class . ':getGoals');
    $group->get('/giving/trends', GivingController::class . ':getTrends');
    $group->get('/giving/projections', GivingController::class . ':getProjections');
    $group->post('/giving', GivingController::class . ':record');
    $group->get('/giving/receipt/{donation_id}', GivingController::class . ':downloadReceipt');
    $group->post('/giving/receipt/{donation_id}/resend', GivingController::class . ':resendReceipt');
    $group->post('/giving/offline', GivingController::class . ':recordOffline');
    $group->post('/giving/goals', GivingController::class . ':createGoal');
    $group->put('/giving/goals/{id}', GivingController::class . ':updateGoal');
    
    // Settings
    $group->get('/settings', SettingsController::class . ':getAll');
    $group->post('/settings', SettingsController::class . ':update');
    $group->get('/settings/church-info', SettingsController::class . ':getChurchInfo');
    $group->post('/settings/church-info', SettingsController::class . ':updateChurchInfo');
    
    // Visitors
    $group->get('/visitors/stats', VisitorController::class . ':getStats');
    $group->get('/visitors/recent', VisitorController::class . ':getRecent');
    $group->patch('/visitors/{id}/status', VisitorController::class . ':updateStatus');
    $group->post('/visitors/{id}/create-member-account', VisitorController::class . ':createMemberAccount');
    $group->post('/visitors/checkin', VisitorController::class . ':registerForCheckin');
    
    // Analytics
    $group->get('/analytics/website', AnalyticsController::class . ':getWebsite');
    $group->get('/analytics/engagement', AnalyticsController::class . ':getEngagement');
    $group->get('/analytics/growth', AnalyticsController::class . ':getGrowth');
    
    // Dashboard
    $group->get('/dashboard/stats', DashboardController::class . ':getStats');
    $group->get('/dashboard/recent-activity', DashboardController::class . ':getRecentActivity');
    $group->get('/dashboard/comprehensive', DashboardController::class . ':getComprehensiveStats');
    
    // Contact submissions (admin)
    $group->get('/contact/submissions', ContactController::class . ':listSubmissions');
    $group->get('/contact/submissions/{id}', ContactController::class . ':getSubmission');
    $group->patch('/contact/submissions/{id}/read', ContactController::class . ':markRead');
    $group->post('/contact/submissions/{id}/reply', ContactController::class . ':reply');
    
    // Reports (Church Management System)
    $group->get('/reports/dashboard', ReportsController::class . ':getDashboard');
    $group->get('/reports/growth', ReportsController::class . ':getGrowth');
    $group->get('/reports/attendance', ReportsController::class . ':getAttendanceReport');
    $group->get('/reports/comparison', ReportsController::class . ':getComparison');
    $group->get('/reports/engagement', ReportsController::class . ':getEngagementScores');
    
    // Attendance Management
    $group->post('/attendance/sunday', AttendanceController::class . ':recordSundayCheckin');
    $group->get('/attendance/sunday', AttendanceController::class . ':getSundayAttendance');
    $group->put('/attendance/sunday/{id}', AttendanceController::class . ':updateSundayCheckin');
    $group->delete('/attendance/sunday/{id}', AttendanceController::class . ':deleteSundayCheckin');
    $group->post('/attendance/cell', AttendanceController::class . ':recordCellAttendance');
    $group->get('/attendance/cell', AttendanceController::class . ':getCellAttendance');
    $group->post('/attendance/polls/generate', AttendanceController::class . ':generateMeetingPolls');
    $group->get('/attendance/polls/my', AttendanceController::class . ':getMyMeetingPolls');
    $group->get('/attendance/polls/{id}', AttendanceController::class . ':getMeetingPoll');
    $group->post('/attendance/polls/{id}/respond', AttendanceController::class . ':respondToMeetingPoll');
    $group->post('/attendance/polls/{id}/confirm', AttendanceController::class . ':confirmMeetingPollAttendance');
    $group->get('/attendance/my', AttendanceController::class . ':getMyAttendance');
    $group->get('/attendance/history', AttendanceController::class . ':getMyAttendance'); // Alias for /attendance/my
    $group->get('/attendance/stats', AttendanceController::class . ':getAttendanceStats');
    $group->get('/attendance/analytics', AttendanceController::class . ':getAnalytics');
    
    // Family Tree
    $group->get('/family/mine',            FamilyController::class . ':getMyFamily');
    $group->get('/family/member/{id}',     FamilyController::class . ':getMemberFamily');
    $group->get('/family/tree/{id}',       FamilyController::class . ':getFamilyTree');
    $group->post('/family/marriage',       FamilyController::class . ':addMarriage');
    $group->patch('/family/marriage/{id}', FamilyController::class . ':updateMarriage');
    $group->post('/family/parent-child',   FamilyController::class . ':addParentChild');
    $group->delete('/family/parent-child', FamilyController::class . ':removeParentChild');

    // Spiritual Lineage
    $group->get('/spiritual-lineage/mine',              SpiritualLineageController::class . ':getMyLineage');
    $group->get('/spiritual-lineage/my-claim',          SpiritualLineageController::class . ':getMyClaim');
    $group->post('/spiritual-lineage/claim',            SpiritualLineageController::class . ':claimSpiritualParent');
    $group->get('/spiritual-lineage/requests',          SpiritualLineageController::class . ':listClaims');
    $group->patch('/spiritual-lineage/requests/{id}',   SpiritualLineageController::class . ':reviewClaim');
    $group->get('/spiritual-lineage/member/{id}',       SpiritualLineageController::class . ':getMemberLineage');
    $group->get('/spiritual-lineage/member/{id}/path',  SpiritualLineageController::class . ':getAncestorPath');
    $group->get('/spiritual-lineage/tree',              SpiritualLineageController::class . ':getFullTree');
    $group->patch('/spiritual-lineage/member/{id}',     SpiritualLineageController::class . ':setSpiritualParent');

    // Disciples Groups
    $group->get('/disciples/enrolled-users',                    DisciplesController::class . ':getEnrolledUsers');
    $group->get('/disciples/groups',                            DisciplesController::class . ':listGroups');
    $group->post('/disciples/groups',                           DisciplesController::class . ':createGroup');
    $group->get('/disciples/groups/{id}',                       DisciplesController::class . ':getGroup');
    $group->patch('/disciples/groups/{id}',                     DisciplesController::class . ':updateGroup');
    $group->post('/disciples/groups/{id}/members',              DisciplesController::class . ':addMember');
    $group->delete('/disciples/groups/{id}/members/{userId}',   DisciplesController::class . ':removeMember');
    $group->get('/disciples/groups/{id}/meetings',              DisciplesController::class . ':listMeetings');
    $group->post('/disciples/groups/{id}/meetings',             DisciplesController::class . ':createMeeting');
    $group->get('/disciples/meetings/{id}/attendance',          DisciplesController::class . ':getMeetingAttendance');
    $group->post('/disciples/meetings/{id}/attendance',         DisciplesController::class . ':saveAttendance');
    $group->post('/disciples/meetings/{id}/rsvp',               DisciplesController::class . ':submitRsvp');
    $group->get('/disciples/meetings/{id}/rsvp',                DisciplesController::class . ':getMeetingRsvps');
    $group->get('/disciples/groups/{id}/lessons',               DisciplesController::class . ':listLessons');
    $group->post('/disciples/groups/{id}/lessons',              DisciplesController::class . ':createLesson');
    $group->patch('/disciples/lessons/{id}',                    DisciplesController::class . ':updateLesson');
    $group->delete('/disciples/lessons/{id}',                   DisciplesController::class . ':deleteLesson');
    $group->post('/disciples/lessons/{id}/read',                DisciplesController::class . ':markLessonRead');
    $group->get('/disciples/stats',                             DisciplesController::class . ':getStats');
    $group->get('/disciples/groups/{id}/notices',               DisciplesController::class . ':listNotices');
    $group->post('/disciples/groups/{id}/notices',              DisciplesController::class . ':createNotice');
    $group->delete('/disciples/notices/{id}',                   DisciplesController::class . ':deleteNotice');

    // Cells Management
    $group->get('/cells', CellsController::class . ':getAll');
    $group->get('/cells/{id}', CellsController::class . ':getOne');
    $group->post('/cells', CellsController::class . ':create');
    $group->put('/cells/{id}', CellsController::class . ':update');
    $group->delete('/cells/{id}', CellsController::class . ':delete');
    $group->post('/cells/{id}/assign', CellsController::class . ':assignMember');
    $group->post('/cells/{id}/assign-bulk', CellsController::class . ':bulkAssignMembers'); // NEW: Bulk assign
    $group->post('/cells/{id}/remove', CellsController::class . ':removeMember');
    $group->post('/cells/{id}/assign-leader', CellsController::class . ':assignLeader');
    $group->get('/cells/{id}/members', CellsController::class . ':getMembers');
    $group->get('/cells/{id}/available-members', CellsController::class . ':getAvailableMembers');
    
    // Zones Management
    $group->get('/zones', ZonesController::class . ':getAll');
    $group->get('/zones/stats', ZonesController::class . ':getStats');
    $group->get('/zones/{id}', ZonesController::class . ':getOne');
    $group->post('/zones', ZonesController::class . ':create');
    $group->put('/zones/{id}', ZonesController::class . ':update');
    $group->delete('/zones/{id}', ZonesController::class . ':delete');
    $group->post('/zones/{id}/assign-leader', ZonesController::class . ':assignLeader');
    $group->post('/zones/{id}/assign-member', ZonesController::class . ':assignMember');
    $group->post('/zones/{id}/remove-member', ZonesController::class . ':removeMember');
    
    // Zone Leader Requests (Members request to become zone leaders)
    $group->post('/zone-leader-requests', ZoneLeaderRequestController::class . ':requestZoneLeader');
    $group->get('/zone-leader-requests/my', ZoneLeaderRequestController::class . ':getMyRequests');
    $group->get('/zone-leader-requests', ZoneLeaderRequestController::class . ':getPendingRequests');
    $group->post('/zone-leader-requests/{id}/approve', ZoneLeaderRequestController::class . ':approveRequest');
    $group->post('/zone-leader-requests/{id}/reject', ZoneLeaderRequestController::class . ':rejectRequest');

    // Cell Change Requests
    $group->post('/cell-change-requests', CellChangeRequestController::class . ':requestChange');
    $group->get('/cell-change-requests/my', CellChangeRequestController::class . ':getMyRequests');
    $group->get('/cell-change-requests/pending', CellChangeRequestController::class . ':getPendingRequests');
    $group->post('/cell-change-requests/process', CellChangeRequestController::class . ':processRequest');
    
    // Absence Management
    $group->get('/absence/flags', AbsenceController::class . ':getFlags');
    $group->post('/absence/resolve', AbsenceController::class . ':resolveFlag');
    $group->post('/absence/pre-mark', AbsenceController::class . ':preMarkAbsence');
    $group->get('/absence/my-requests', AbsenceController::class . ':getMyRequests');
    $group->post('/absence/process-request', AbsenceController::class . ':processRequest');
    $group->get('/absence/summary', AbsenceController::class . ':getSummary');

    // Follow-up Notes
    $group->get('/follow-up-notes', FollowUpNotesController::class . ':getAll');
    $group->post('/follow-up-notes', FollowUpNotesController::class . ':create');
    $group->put('/follow-up-notes/{id}', FollowUpNotesController::class . ':update');

    // Member follow-up email centre
    $group->get('/follow-up/summary', FollowUpController::class . ':getSummary');
    $group->get('/follow-up/members', FollowUpController::class . ':getMembers');
    $group->get('/follow-up/emails', FollowUpController::class . ':getEmails');
    $group->post('/follow-up/emails/send', FollowUpController::class . ':sendEmail');
    
    // Announcements
    $group->get('/announcements', AnnouncementsController::class . ':getAll');
    $group->post('/announcements', AnnouncementsController::class . ':create');
    $group->put('/announcements/{id}', AnnouncementsController::class . ':update');
    $group->delete('/announcements/{id}', AnnouncementsController::class . ':delete');
    
    // Notifications
    $group->post('/notifications', NotificationController::class . ':send');
    $group->post('/notifications/bulk', NotificationController::class . ':sendBulk');
    $group->get('/notifications/templates', NotificationController::class . ':getTemplates');
    $group->get('/notifications/stats', NotificationController::class . ':getStats');
    $group->get('/notifications/user', NotificationController::class . ':getUserNotifications');
    $group->patch('/notifications/{id}/read', NotificationController::class . ':markAsRead');
    $group->patch('/notifications/read-all', NotificationController::class . ':markAllAsRead');
    $group->delete('/notifications/{id}', NotificationController::class . ':delete');
    
    // Chat
    $group->get('/chat/rooms', ChatController::class . ':getRooms');
    $group->post('/chat/rooms', ChatController::class . ':createRoom');
    $group->post('/chat/rooms/initialize', ChatController::class . ':initializeRooms');
    $group->get('/chat/rooms/{id}/messages', ChatController::class . ':getMessages');
    $group->post('/chat/rooms/{id}/messages', ChatController::class . ':sendMessage');
    $group->post('/chat/rooms/{id}/join', ChatController::class . ':joinRoom');
    $group->post('/chat/rooms/{id}/leave', ChatController::class . ':leaveRoom');
    $group->get('/chat/rooms/{id}/info', ChatController::class . ':getRoomInfo');
    $group->patch('/chat/rooms/{id}/messages/read', ChatController::class . ':markAsRead');
    $group->get('/chat/rooms/{id}/search', ChatController::class . ':searchMessages');
    $group->post('/chat/messages/{id}/react', ChatController::class . ':reactToMessage');
    $group->delete('/chat/messages/{id}', ChatController::class . ':deleteMessage');
    $group->get('/chat/stats', ChatController::class . ':getStats');

    // Developer API keys
    $group->get('/developers/api-keys', DeveloperApiKeysController::class . ':getAll');
    $group->post('/developers/api-keys', DeveloperApiKeysController::class . ':create');
    $group->delete('/developers/api-keys/{id}', DeveloperApiKeysController::class . ':delete');
    $group->get('/api-keys/{id}/usage', DeveloperApiKeysController::class . ':getUsage');
    
    // File upload
    $group->post('/upload', UploadController::class . ':upload');
    $group->delete('/upload/{id}', UploadController::class . ':delete');
    
    // Home Images Management
    $group->get('/home-images/stats/overview', HomeImagesController::class . ':getImageStats');
    $group->get('/home-images/config/upload', HomeImagesController::class . ':getUploadConfig');
    $group->post('/home-images/upload', HomeImagesController::class . ':upload');
    $group->put('/home-images/bulk/update', HomeImagesController::class . ':bulkUpdate');
    $group->delete('/home-images/bulk/delete', HomeImagesController::class . ':bulkDelete');
    $group->put('/home-images/reorder', HomeImagesController::class . ':reorder');
    $group->get('/home-images/{id}/analytics', HomeImagesController::class . ':getImageAnalytics');
    $group->put('/home-images/{id}', HomeImagesController::class . ':update');
    $group->delete('/home-images/{id}', HomeImagesController::class . ':delete');
    
    // Video/Audio streaming
    $group->get('/sermons/video/{id}', SermonsController::class . ':getVideo');
    $group->get('/sermons/audio/{id}', SermonsController::class . ':getAudio');
    $group->get('/sermons/thumbnail/{id}', SermonsController::class . ':getThumbnail');
    
    // System Admin Routes (superadmin only)
    $group->post('/system/migrations', SystemController::class . ':runMigrations');
    
})->add(new JwtMiddleware());

// Catch-all route for file serving - must be at root level after all API routes
$app->any('/uploads/{filepath:.+}', function ($request, $response, $args) {
    $filepath = $args['filepath'] ?? '';
    if (empty($filepath)) {
        return $response->withStatus(404);
    }

    $filepath = ltrim(str_replace(['\\', '..'], ['/', ''], $filepath), '/');
    $uploadDirs = array_values(array_unique(array_filter([
        getenv('UPLOAD_PATH') ?: null,
        __DIR__ . '/../uploads/',
        __DIR__ . '/../public/uploads/',
    ])));

    $fullPathReal = null;
    $matchedBase = null;
    foreach ($uploadDirs as $uploadDir) {
        $normalizedDir = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $uploadDir), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $candidate = $normalizedDir . str_replace('/', DIRECTORY_SEPARATOR, $filepath);
        $candidateReal = realpath($candidate);
        if ($candidateReal && is_file($candidateReal)) {
            $fullPathReal = $candidateReal;
            $matchedBase = realpath($normalizedDir) ?: $normalizedDir;
            break;
        }
    }

    if (!$fullPathReal) {
        error_log("File not found: requested=$filepath, searched=" . implode('|', $uploadDirs));
        return $response->withStatus(404);
    }

    if ($matchedBase && strpos($fullPathReal, $matchedBase) !== 0) {
        error_log("Security: file outside uploads dir: $fullPathReal");
        return $response->withStatus(403);
    }
    
    // Get MIME type
    $mimeType = mime_content_type($fullPathReal) ?: 'application/octet-stream';
    $fileSize = filesize($fullPathReal);
    
    // Set appropriate headers
    $response = $response
        ->withHeader('Content-Type', $mimeType)
        ->withHeader('Content-Length', (string)$fileSize)
        ->withHeader('Cache-Control', 'public, max-age=31536000')
        ->withHeader('Access-Control-Allow-Origin', '*');
    
    // Stream file content
    $stream = fopen($fullPathReal, 'rb');
    if ($stream) {
        $response->getBody()->write(stream_get_contents($stream));
        fclose($stream);
    }
    
    return $response;
});
