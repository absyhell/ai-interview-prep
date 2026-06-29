import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import ResumeAnalyzer from "@/pages/ResumeAnalyzer";
import ResumeHistory from "@/pages/ResumeHistory";
import MockInterview from "@/pages/MockInterview";
import InterviewResult from "@/pages/InterviewResult";
import InterviewList from "@/pages/InterviewList";
import Compare from "@/pages/Compare";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function App() {
  useEffect(() => { document.title = "PrepStack — AI Interview Lab"; }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors closeButton theme="system" />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resume" element={<ResumeAnalyzer />} />
              <Route path="/resume/history" element={<ResumeHistory />} />
              <Route path="/interview" element={<InterviewList />} />
              <Route path="/interview/new" element={<MockInterview />} />
              <Route path="/interview/:id" element={<InterviewResult />} />
              <Route path="/compare" element={<Compare />} />
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
