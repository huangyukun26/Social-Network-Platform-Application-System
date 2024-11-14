import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyle } from './styles/globalStyles';
import AppLayout from './components/Layout/AppLayout';
import Home from './components/Home/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Profile from './components/Profile/Profile';
import EditProfile from './components/Profile/EditProfile';
import Friends from './components/Friends/Friends';
import AdminRoute from './components/Auth/AdminRoute';
import AdminDashboard from './components/admin/AdminDashboard';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <GlobalStyle />
      <Routes>
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/friends" element={
          <PrivateRoute>
            <AppLayout>
              <Friends />
            </AppLayout>
          </PrivateRoute>
        } />
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </PrivateRoute>
        } />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/profile/:userId" element={
          <PrivateRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
