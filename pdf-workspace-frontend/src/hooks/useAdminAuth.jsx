import React, { createContext, useContext, useState, useEffect } from 'react';
import adminApi from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('admin_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await adminApi.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('admin_user', JSON.stringify(res.data));
      } catch (err) {
        console.error('Failed to verify admin auth session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [token]);

  const login = async (username, password) => {
    const res = await adminApi.post('/auth/login', { username, password });
    const { token: jwtToken, user: userData } = res.data;

    localStorage.setItem('admin_token', jwtToken);
    localStorage.setItem('admin_user', JSON.stringify(userData));

    setToken(jwtToken);
    setUser(userData);
    return userData;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await adminApi.post('/auth/change-password', { currentPassword, newPassword });
    setUser(res.data);
    localStorage.setItem('admin_user', JSON.stringify(res.data));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, token, loading, login, logout, changePassword, isAuthenticated: !!token }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
