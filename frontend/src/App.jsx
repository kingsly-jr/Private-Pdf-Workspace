import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminAuthProvider } from './hooks/useAdminAuth';
import AdminRoute from './components/auth/AdminRoute';
import AdminLayout from './components/layout/AdminLayout';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardOverview from './pages/admin/AdminDashboardOverview';
import AdminFeaturesPage from './pages/admin/AdminFeaturesPage';
import AdminHistoryPage from './pages/admin/AdminHistoryPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';

import PublicHomePage from './pages/PublicHomePage';
import AboutPage from './pages/AboutPage';
import FaqPage from './pages/FaqPage';
import NotFoundPage from './pages/NotFoundPage';

import PdfPageToolView from './components/tools/PdfPageToolView';
import PdfConversionToolView from './components/tools/PdfConversionToolView';
import PdfSecurityToolView from './components/tools/PdfSecurityToolView';
import PdfAnnotationToolView from './components/tools/PdfAnnotationToolView';
import PdfCompressionToolView from './components/tools/PdfCompressionToolView';
import PdfAiSummaryToolView from './components/tools/PdfAiSummaryToolView';

const CONVERSION_SLUGS = new Set([
  'pdf-to-word', 'word-to-pdf', 'pdf-to-excel', 'excel-to-pdf',
  'pdf-to-powerpoint', 'powerpoint-to-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'extract-text',
  'pdf-to-markdown', 'scan-to-pdf', 'html-to-pdf', 'pdf-to-pdfa', 'translate', 'pdf-forms'
]);

const SECURITY_SLUGS = new Set([
  'protect', 'unlock', 'redact', 'repair', 'compare', 'ocr', 'metadata-editor'
]);

const ANNOTATION_SLUGS = new Set([
  'watermark', 'page-numbers', 'sign-pdf', 'edit-pdf'
]);

function DynamicToolRouter() {
  const { slug } = useParams();
  if (slug === 'ai-summary') {
    return <PdfAiSummaryToolView />;
  }
  if (slug === 'compress') {
    return <PdfCompressionToolView />;
  }
  if (CONVERSION_SLUGS.has(slug)) {
    return <PdfConversionToolView />;
  }
  if (SECURITY_SLUGS.has(slug)) {
    return <PdfSecurityToolView />;
  }
  if (ANNOTATION_SLUGS.has(slug)) {
    return <PdfAnnotationToolView />;
  }
  return <PdfPageToolView />;
}

function App() {
  React.useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa_redirect_path');
    if (redirectPath && redirectPath !== window.location.pathname) {
      sessionStorage.removeItem('spa_redirect_path');
      window.history.replaceState(null, '', redirectPath);
    }
  }, []);

  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public Open Tool Routes */}
          <Route path="/" element={<PublicHomePage />} />
          <Route path="/tools" element={<PublicHomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />

          {/* Group A, B, C, D & E Dynamic Tool Workspaces */}
          <Route path="/tools/:slug" element={<DynamicToolRouter />} />

          {/* Admin Portal Authentication */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Management Suite */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardOverview />} />
            <Route path="features" element={<AdminFeaturesPage />} />
            <Route path="history" element={<AdminHistoryPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="accounts" element={<AdminAccountsPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;
