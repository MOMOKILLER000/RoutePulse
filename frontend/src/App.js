import React, { Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Loading from './components/Loading';

const CarRoutes = React.lazy(() => import('./pages/TransportPages/CarRoutes'));
const Login = React.lazy(() => import('./pages/Authentification/Login'));
const Publictransport = React.lazy(() => import('./pages/TransportPages/Publictransport'));
const Signup = React.lazy(() => import('./pages/Authentification/Signup'));
const Index = React.lazy(() => import('./pages/PostsPages/Index.js'));
const Bucharest = React.lazy(() => import('./pages/TransportPages/Bucharest'));
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
const Notifications = React.lazy(() => import('./pages/AddingPages/PushNotification'));
function App() {
  useEffect(() => {
    // Register the service worker for Firebase Cloud Messaging
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
    }
  }, []);

  return (
      <div>
        {/* Suspense to show custom loading page while waiting for components */}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />
            <Route path="/Bucharest/:transport" element={<Bucharest />} />
            <Route path="/Cars" element={<CarRoutes />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/:city/:transport" element={<Publictransport />} />
            <Route path="/Articles" element={<Articles />} />
            <Route path="/Reports" element={<Reports />} />
            <Route path="/FaceLogin" element={<FaceLogin />} />
            <Route path="/UserRoutes" element={<UserRoutes />} />
            <Route path="/Accidents" element={<Accidents />} />
            <Route path="/ArticlePosting" element={<ArticlePosting />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/AllArticles" element={<AllArticles />} />
            <Route path="/Contact" element={<Contact />} />
            <Route path="/Prizes" element={<Prizes />} />
            <Route path="/Notifications" element={<Notifications />} />
          </Routes>
        </Suspense>
      </div>
  );
}

export default App;