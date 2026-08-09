import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('civicfix_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data);
        } catch (error) {
          console.error('Failed to restore session:', error);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      const { access_token, role, user_id, username: name } = response.data;
      
      localStorage.setItem('civicfix_token', access_token);
      localStorage.setItem('civicfix_user', JSON.stringify({ id: user_id, username: name, role }));
      
      setToken(access_token);
      setUser({ id: user_id, username: name, role_name: role });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password, roleName) => {
    setLoading(true);
    try {
      await authAPI.signup(username, email, password, roleName);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      const message = error.response?.data?.detail || 'Registration failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('civicfix_token');
    localStorage.removeItem('civicfix_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, hasRole, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
