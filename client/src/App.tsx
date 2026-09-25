import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleRoute } from './components/auth/RoleRoute';

// Pages
import { WelcomeLandingPage } from './pages/WelcomeLandingPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { PoliceDashboardPage } from './pages/PoliceDashboardPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsModelsPage } from './pages/AnalyticsModelsPage';
import { StateAnalyticsPage } from './pages/StateAnalyticsPage';
import { DistrictExplorerPage } from './pages/DistrictExplorerPage';
import { CrimeRecordsPage } from './pages/CrimeRecordsPage';
import { UploadPage } from './pages/UploadPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { RegionReportsPage } from './pages/RegionReportsPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { EmergencyReportPage } from './pages/EmergencyReportPage';
import { PoliceEmergencyPage } from './pages/PoliceEmergencyPage';

export const App: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const isPublicPage =
    ['/', '/welcome', '/overview', '/login', '/register', '/forgot-password', '/emergency', '/report-crime'].includes(location.pathname) ||
    location.pathname.startsWith('/login');

  return (
    <div className="min-h-screen bg-[#FFF7F4] text-[#2B1F1D] flex flex-col font-sans">
      <Navbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex flex-1">
        {/* Sidebar only rendered on authenticated inner pages */}
        {!isPublicPage && (
          <Sidebar
            isOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-200 ${!isPublicPage ? 'lg:pl-64' : ''}`}>
          <div className={!isPublicPage ? 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto' : ''}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<WelcomeLandingPage />} />
              <Route path="/welcome" element={<WelcomeLandingPage />} />
              <Route path="/overview" element={<LandingPage />} />
              <Route path="/emergency" element={<EmergencyReportPage />} />
              <Route path="/report-crime" element={<EmergencyReportPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/user" element={<Navigate to="/login?role=user" replace />} />
              <Route path="/login/police" element={<Navigate to="/login?role=police" replace />} />
              <Route path="/login/admin" element={<Navigate to="/login?role=admin" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* -------------------------------------------------------- */}
              {/* ROLE-SPECIFIC DASHBOARDS (RBAC) */}
              {/* -------------------------------------------------------- */}
              {/* 1. CITIZEN / USER DASHBOARD */}
              <Route
                path="/user/dashboard"
                element={
                  <RoleRoute allowedRoles={['user', 'admin']}>
                    <UserDashboardPage />
                  </RoleRoute>
                }
              />
              <Route path="/user-dashboard" element={<Navigate to="/user/dashboard" replace />} />

              {/* 2. POLICE / HIGHER OFFICER DASHBOARD */}
              <Route
                path="/police/dashboard"
                element={
                  <RoleRoute allowedRoles={['police', 'admin']}>
                    <PoliceDashboardPage />
                  </RoleRoute>
                }
              />
              <Route path="/police-dashboard" element={<Navigate to="/police/dashboard" replace />} />
              <Route
                path="/police-emergency"
                element={
                  <RoleRoute allowedRoles={['police', 'admin']}>
                    <PoliceEmergencyPage />
                  </RoleRoute>
                }
              />

              {/* 3. ADMINISTRATOR DASHBOARD */}
              <Route
                path="/admin/dashboard"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </RoleRoute>
                }
              />

              {/* -------------------------------------------------------- */}
              {/* GENERAL INTELLIGENCE & ANALYTICS PAGES */}
              {/* -------------------------------------------------------- */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics-models"
                element={
                  <ProtectedRoute>
                    <AnalyticsModelsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/state-analytics"
                element={
                  <ProtectedRoute>
                    <StateAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/district-explorer"
                element={
                  <ProtectedRoute>
                    <DistrictExplorerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/records"
                element={
                  <ProtectedRoute>
                    <CrimeRecordsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <RoleRoute allowedRoles={['user', 'police', 'admin']}>
                    <UploadPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/predictions"
                element={
                  <ProtectedRoute>
                    <PredictionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <RegionReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRoute>
                    <HelpPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all fallback */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};
