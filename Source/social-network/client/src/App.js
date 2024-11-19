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
import Messages from './pages/Messages';

function App() {
  const isAuthenticated = () => {
    const token = sessionStorage.getItem('token');
    const tokenExpiry = sessionStorage.getItem('tokenExpiry');
    const user = sessionStorage.getItem('user');
    
    if (!token || !tokenExpiry || !user) {
        return false;
    }
    
    if (new Date().getTime() > parseInt(tokenExpiry)) {
        sessionStorage.clear();
        return false;
    }
    
    return true;
  };

  const PrivateRoute = ({ children }) => {
    const auth = isAuthenticated();
    
    React.useEffect(() => {
        if (!auth) {
            sessionStorage.clear();
        }
    }, [auth]);
    
    return auth ? children : <Navigate to="/login" replace />;
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
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </Router>
  );
}

export default App;
