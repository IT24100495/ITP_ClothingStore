import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Loyalty from './pages/Loyalty';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import Payment from './pages/Payment';
import AdminDashboard from './pages/AdminDashboard';
import Gift from './pages/Gift';
import GiftPayment from './pages/GiftPayment';
import MakeReturn from './pages/MakeReturn';
import Returns from './pages/Returns';
import SubmitRequest from './pages/SubmitRequest';
import Wishlist from './pages/Wishlist';
import LimitedTimeSale from './pages/LimitedTimeSale';
import Sales from './pages/Sales';
import Notifications from './pages/Notifications';

function App() {
    return (
        <AuthProvider>
            <CurrencyProvider>
                <CartProvider>
                    <Router>
                    <div className="app">
                        <Navbar />
                        <main className="app-main">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/shop" element={<Shop />} />
                                <Route path="/sales" element={<Sales />} />
                                <Route path="/limited-sale/:offerId" element={<LimitedTimeSale />} />
                                <Route path="/product/:id" element={<ProductDetail />} />
                                <Route path="/cart" element={<Cart />} />
                                <Route path="/wishlist" element={<Wishlist />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/loyalty" element={<Loyalty />} />
                                <Route path="/orders" element={<Orders />} />
                                <Route path="/tracking/:id" element={<OrderTracking />} />
                                <Route path="/tracking" element={<OrderTracking />} />
                                <Route path="/payment" element={<Payment />} />
                                <Route path="/gift" element={<Gift />} />
                                <Route path="/gift-payment" element={<GiftPayment />} />
                                <Route path="/make-return" element={<MakeReturn />} />
                                <Route path="/returns" element={<Returns />} />
                                <Route path="/submit-request" element={<SubmitRequest />} />
                                <Route path="/notifications" element={<Notifications />} />
                                <Route path="/admin" element={<ProtectedRoute element={<AdminDashboard />} adminOnly={true} />} />
                            </Routes>
                        </main>
                    </div>
                    </Router>
                </CartProvider>
            </CurrencyProvider>
        </AuthProvider>
    );
}

export default App;
