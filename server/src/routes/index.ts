import { Router } from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController';
import * as analyticsController from '../controllers/analyticsController';
import * as recordsController from '../controllers/recordsController';
import * as datasetsController from '../controllers/datasetsController';
import * as uploadController from '../controllers/uploadController';
import * as predictionsController from '../controllers/predictionsController';
import * as reportsController from '../controllers/reportsController';
import * as emergencyController from '../controllers/emergencyController';
import * as adminController from '../controllers/adminController';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

const emergencyUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/citizen-login', authController.citizenLogin);
router.post('/auth/police-login', authController.policeLogin);
router.post('/auth/send-otp', authController.sendOTP);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/forgot-password', authController.forgotPassword);
router.get('/auth/me', authenticate, authController.me);

// Analytics Routes (Read with optional auth)
router.get('/analytics/kpis', optionalAuthenticate, analyticsController.getKPIs);
router.get('/analytics/charts', optionalAuthenticate, analyticsController.getCharts);
router.get('/analytics/locations', optionalAuthenticate, analyticsController.getLocationHierarchy);
router.get('/analytics/years', optionalAuthenticate, analyticsController.getAvailableYears);

// Crime Records Routes (Read with optional auth)
router.get('/records', optionalAuthenticate, recordsController.getRecords);
router.get('/records/export', optionalAuthenticate, recordsController.exportRecords);

// Datasets Routes
router.get('/datasets', optionalAuthenticate, datasetsController.getDatasets);
router.get('/datasets/:id', optionalAuthenticate, datasetsController.getDatasetById);
router.delete('/datasets/:id', authenticate, requireAdmin, datasetsController.deleteDataset);

// Upload & Validation Routes (Authenticated user)
router.post('/upload/validate', optionalAuthenticate, upload.single('file'), uploadController.validateUploadedFile);
router.post('/upload/import', optionalAuthenticate, uploadController.commitImport);

// Predictions Route
router.get('/predictions', optionalAuthenticate, predictionsController.getPredictions);

// Region Reports Route
router.get('/reports/region', optionalAuthenticate, reportsController.getRegionReport);

// Citizen & Police Emergency Routes
router.post('/emergency/report', emergencyUpload, emergencyController.createReport);
router.get('/emergency/reports', optionalAuthenticate, emergencyController.getReports);
router.get('/emergency/stats', optionalAuthenticate, emergencyController.getStats);
router.get('/emergency/my-reports', optionalAuthenticate, emergencyController.getMyReports);
router.get('/emergency/reports/:code', optionalAuthenticate, emergencyController.getReportByCode);
router.put('/emergency/reports/:code/status', optionalAuthenticate, emergencyController.updateReportStatus);
router.patch('/emergency/reports/:code/status', optionalAuthenticate, emergencyController.updateReportStatus);
router.post('/emergency/reports/:code/patrol-status', optionalAuthenticate, emergencyController.updatePatrolLifecycleStatus);
router.patch('/emergency/reports/:code/patrol-status', optionalAuthenticate, emergencyController.updatePatrolLifecycleStatus);
router.post('/emergency/reports/:code/assign-patrol', optionalAuthenticate, emergencyController.assignPatrol);
router.post('/emergency/reports/:code/backup-request', optionalAuthenticate, emergencyController.requestBackup);
router.post(
  '/emergency/reports/:code/officer-notes',
  optionalAuthenticate,
  upload.fields([{ name: 'scene_photos', maxCount: 5 }]),
  emergencyController.submitOfficerNotes
);
router.get('/emergency/audit-trail', optionalAuthenticate, emergencyController.getAuditTrail);
router.post('/emergency/check-escalations', optionalAuthenticate, emergencyController.triggerEscalationCheck);
router.get('/emergency/stream', emergencyController.streamEmergencyEvents);
router.delete('/emergency/reports/:code/media/:mediaType', optionalAuthenticate, emergencyController.deleteReportMedia);

// Incident API Aliases for Frontend Compatibility
router.post('/incidents/report', emergencyUpload, emergencyController.createReport);
router.get('/incidents/my-reports', optionalAuthenticate, emergencyController.getMyReports);
router.get('/incidents/police-feed', optionalAuthenticate, emergencyController.getReports);
router.get('/incidents/stats', optionalAuthenticate, emergencyController.getStats);
router.put('/incidents/:code/status', optionalAuthenticate, emergencyController.updateReportStatus);
router.patch('/incidents/:code/status', optionalAuthenticate, emergencyController.updateReportStatus);
router.post('/incidents/:code/assign-patrol', optionalAuthenticate, emergencyController.assignPatrol);
router.get('/incidents/police-actions/logs', optionalAuthenticate, emergencyController.getAuditTrail);

// Nearest Police Station & Patrol Dispatch Routes
router.get('/emergency/stations', optionalAuthenticate, emergencyController.getAllPoliceStations);
router.get('/emergency/nearest-station', optionalAuthenticate, emergencyController.getNearestPoliceStation);
router.post('/emergency/patrol-status', optionalAuthenticate, emergencyController.updatePatrolLifecycleStatus);
router.patch('/emergency/patrol-status', optionalAuthenticate, emergencyController.updatePatrolLifecycleStatus);
router.post('/emergency/manual-dispatch', optionalAuthenticate, emergencyController.manualDispatchPatrol);

// Officer notification badge count & report viewing endpoints
router.get('/emergency/unread-count', optionalAuthenticate, emergencyController.getUnreadCount);
router.post('/emergency/reports/:code/read', optionalAuthenticate, emergencyController.markReportRead);
router.post('/emergency/reports/:code/view', optionalAuthenticate, emergencyController.markReportViewed);
router.post('/incidents/:code/view', optionalAuthenticate, emergencyController.markReportViewed);

// Admin User Management & System Stats Routes
router.get('/admin/users', authenticate, requireAdmin, adminController.getAdminUsers);
router.post('/admin/users', authenticate, requireAdmin, adminController.createAdminUser);
router.put('/admin/users/:id', authenticate, requireAdmin, adminController.updateAdminUser);
router.put('/admin/users/:id/role', authenticate, requireAdmin, adminController.updateAdminUser);
router.delete('/admin/users/:id', authenticate, requireAdmin, adminController.deleteAdminUser);
router.get('/admin/system-stats', authenticate, requireAdmin, adminController.getAdminSystemStats);

export default router;


