import React, { Suspense } from 'react';
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
function App() {

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
          </Routes>
        </Suspense>
      </div>
  );
}

export default App;