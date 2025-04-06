import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loading from './components/Loading';

const CarRoutes = React.lazy(() => import('./pages/TransportPages/CarRoutes'));
const Login = React.lazy(() => import('./pages/Authentification/Login'));
const AdminLogin = React.lazy(() => import('./pages/Authentification/AdminLogin'));
const Publictransport = React.lazy(() => import('./pages/TransportPages/Publictransport'));
const Signup = React.lazy(() => import('./pages/Authentification/Signup'));
const Index = React.lazy(() => import('./pages/PostsPages/Index.js'));
const Profile = React.lazy(() => import('./pages/UsersPages/Profile'));
const Articles = React.lazy(() => import('./pages/PostsPages/Articles'));
const Reports = React.lazy(() => import('./pages/PostsPages/Reports'));
const FaceLogin = React.lazy(() => import('./pages/Authentification/FaceLogin'));
const UserRoutes = React.lazy(() => import('./pages/UsersPages/UserRoutes'));
const Accidents = React.lazy(() => import('./pages/AddingPages/Accidents'));
const ArticlePosting = React.lazy(() => import('./pages/AddingPages/ArticlePosting'));
const ArticleDetail = React.lazy(() => import('./pages/PostsPages/ArticleDetails'));
const AllArticles = React.lazy(() => import('./pages/PostsPages/AllArticles'));
const Contact = React.lazy(() => import('./pages/UsersPages/Contact'));
const Prizes = React.lazy(() => import('./pages/UsersPages/Prizes'));
const Admin = React.lazy(() => import('./pages/AddingPages/admin'));
const Report = React.lazy(() => import('./pages/PostsPages/Report'));
const UseRoute = React.lazy(() => import('./pages/TransportPages/UseRoute'));
const Feedback = React.lazy(() => import('./pages/AddingPages/Feedback'));
const PleaseLogin = React.lazy(() => import('./components/PleaseLogin'));
const EditData = React.lazy(() => import('./pages/AddingPages/EditData'));
const EndRoute =  React.lazy(() => import('./pages/TransportPages/EndRoute'));
const AIChat = React.lazy(() => import('./pages/UsersPages/AIChat'));
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
  }

  useEffect(() => {
    fetch('http://localhost:8000/api/user/', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
          console.log("User Data:", data);
          setUser(data);
        })
        .catch(error => console.error("Error fetching user data:", error))
        .finally(() => setLoading(false));
  }, []);


  const ProtectedRoute = ({ children }) => {
    if (loading) return <Loading />;
    return user ? children : <Navigate to="/please-login" />;
  };


  const AdminRoute = ({ children }) => {
    if (loading) return <Loading />;
    return user?.is_superuser ? children : <Navigate to="/" />;
  };

  const PrizeRoute = ({ children }) => {
    if (loading) return <Loading />;
    return user?.prize3 ? children : <Navigate to="/" />;
  }
  return (
      <div>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/Cars" element={<CarRoutes />} />
            <Route path="/:city/:transport" element={<Publictransport />} />
            <Route path="/Articles" element={<Articles />} />
            <Route path="/Reports" element={<Reports />} />
            <Route path="/FaceLogin" element={<FaceLogin />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/AllArticles" element={<AllArticles />} />
            <Route path="/Contact" element={<Contact />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/use-route" element={<UseRoute />} />
            <Route path="/please-login" element={<PleaseLogin />} />
            <Route path="/end-route" element={<EndRoute />} />
            {}
            <Route path="/Profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/UserRoutes" element={<ProtectedRoute><UserRoutes /></ProtectedRoute>} />
            <Route path="/Accidents" element={<ProtectedRoute><Accidents /></ProtectedRoute>} />
            <Route path="/Prizes" element={<ProtectedRoute><Prizes /></ProtectedRoute>} />

            {}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/ArticlePosting" element={<AdminRoute><ArticlePosting /></AdminRoute>} />
            <Route path="/feedback/:id" element={<AdminRoute><Feedback /></AdminRoute>} />
            <Route path="/edit-data" element={<AdminRoute><EditData /></AdminRoute>} />
            {}
            <Route path="ai-chat" element={<PrizeRoute><AIChat /></PrizeRoute>} />
          </Routes>
        </Suspense>
      </div>
  );
}

export default App;
