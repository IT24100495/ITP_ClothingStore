import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ element, adminOnly = false }) => {
    const { userInfo } = useContext(AuthContext);

    if (!userInfo) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && userInfo.role !== 'admin') {
        // Not an admin
        return <Navigate to="/" replace />;
    }

    return element;
};

export default ProtectedRoute;
