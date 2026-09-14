import { Router } from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController';
import * as analyticsController from '../controllers/analyticsController';
import * as recordsController from '../controllers/recordsController';
import * as datasetsController from '../controllers/datasetsController';
import * as uploadController from '../controllers/uploadController';
import * as predictionsController from '../controllers/predictionsController';
import * as reportsController from '../controllers/reportsController';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
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

export default router;
