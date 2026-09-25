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
import * as incidentController from '../controllers/incidentController';
import * as adminController from '../controllers/adminController';
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
  requirePoliceOrAdmin,
  requireUserOrAdmin
} from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

const emergencyUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// -------------------------------------------------------------
// AUTHENTICATION & PROFILE ROUTES
// -------------------------------------------------------------
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.post('/auth/forgot-password', authController.forgotPassword);
router.get('/auth/me', authenticate, authController.me);

// -------------------------------------------------------------
// USER & CITIZEN INCIDENT REPORTING ROUTES
// -------------------------------------------------------------
// Submit incident (User / Citizen or Admin) - stored in MongoDB & mirrored
router.post('/incidents/report', authenticate, requireUserOrAdmin, emergencyUpload, incidentController.createIncident);
// Fetch incidents submitted by logged in user
router.get('/incidents/my-reports', authenticate, requireUserOrAdmin, incidentController.getMyIncidents);

// -------------------------------------------------------------
// POLICE & HIGHER OFFICER COMMAND ROUTES
// -------------------------------------------------------------
// Police incident feed (Police & Admin only)
router.get('/incidents/police-feed', authenticate, requirePoliceOrAdmin, incidentController.getPoliceFeed);
// Police updates status & officer notes (stored in MongoDB)
router.put('/incidents/:code/status', authenticate, requirePoliceOrAdmin, incidentController.updateIncidentStatus);
// Police dispatches patrol unit
router.post('/incidents/:code/assign-patrol', authenticate, requirePoliceOrAdmin, incidentController.assignPatrol);
// Police action audit logs
router.get('/incidents/police-actions/logs', authenticate, requirePoliceOrAdmin, incidentController.getPoliceActionLogs);

// -------------------------------------------------------------
// ADMIN MANAGEMENT & AUDIT ROUTES
// -------------------------------------------------------------
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.post('/admin/users', authenticate, requireAdmin, adminController.createUser);
router.put('/admin/users/:id/role', authenticate, requireAdmin, adminController.updateUserRole);
router.delete('/admin/users/:id', authenticate, requireAdmin, adminController.deleteUser);
router.get('/admin/system-stats', authenticate, requireAdmin, adminController.getSystemStats);

// -------------------------------------------------------------
// ANALYTICS & DATASET EXPLORATION ROUTES
// -------------------------------------------------------------
router.get('/analytics/kpis', optionalAuthenticate, analyticsController.getKPIs);
router.get('/analytics/charts', optionalAuthenticate, analyticsController.getCharts);
router.get('/analytics/locations', optionalAuthenticate, analyticsController.getLocationHierarchy);
router.get('/analytics/years', optionalAuthenticate, analyticsController.getAvailableYears);

router.get('/records', optionalAuthenticate, recordsController.getRecords);
router.get('/records/export', optionalAuthenticate, recordsController.exportRecords);

router.get('/datasets', optionalAuthenticate, datasetsController.getDatasets);
router.get('/datasets/:id', optionalAuthenticate, datasetsController.getDatasetById);
router.delete('/datasets/:id', authenticate, requireAdmin, datasetsController.deleteDataset);

// Dataset Upload & Ingestion (Accessible to User, Police, and Admin roles)
router.post('/upload/validate', authenticate, upload.single('file'), uploadController.validateUploadedFile);
router.post('/upload/import', authenticate, uploadController.commitImport);

router.get('/predictions', optionalAuthenticate, predictionsController.getPredictions);
router.get('/reports/region', optionalAuthenticate, reportsController.getRegionReport);

// -------------------------------------------------------------
// BACKWARDS-COMPATIBLE EMERGENCY SOS ROUTES
// -------------------------------------------------------------
router.post('/emergency/report', emergencyUpload, emergencyController.createReport);
router.get('/emergency/reports', optionalAuthenticate, emergencyController.getReports);
router.get('/emergency/reports/:code', optionalAuthenticate, emergencyController.getReportByCode);
router.put('/emergency/reports/:code/status', optionalAuthenticate, emergencyController.updateReportStatus);
router.post('/emergency/reports/:code/assign-patrol', optionalAuthenticate, emergencyController.assignPatrol);
router.delete('/emergency/reports/:code/media/:mediaType', optionalAuthenticate, emergencyController.deleteReportMedia);
router.get('/emergency/stream', emergencyController.streamEmergencyEvents);

export default router;
