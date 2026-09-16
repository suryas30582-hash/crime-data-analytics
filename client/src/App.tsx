import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
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

  const isPublicPage = ['/', '/login', '/register', '/forgot-password', '/emergency'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col font-sans">
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
              <Route path="/" element={<LandingPage />} />
              <Route path="/emergency" element={<EmergencyReportPage />} />
              <Route path="/report-crime" element={<EmergencyReportPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Police Emergency Command Hub (Accessible to analysts / officers) */}
              <Route path="/police-emergency" element={<PoliceEmergencyPage />} />

              {/* Protected Intelligence Pages */}
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
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
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

              {/* Admin Protected Route */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
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
