import { createBrowserRouter, Navigate } from 'react-router';
import Home from './pages/Home';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Matching from './pages/Matching';
import Events from './pages/Events';
import EventCreate from './pages/EventCreate';
import AdminEvents from './pages/AdminEvents';
import Messages from './pages/Messages';
import ChatRoom from './pages/ChatRoom';
import DirectChat from './pages/DirectChat';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/home',
    element: <Home />,
  },
  {
    path: '/feed',
    element: <Feed />,
  },
  {
    path: '/explore',
    element: <Explore />,
  },
  {
    path: '/matching',
    element: <Matching />,
  },
  {
    path: '/events',
    element: <Events />,
  },
  {
    path: '/events/create',
    element: <EventCreate />,
  },
  {
    path: '/admin/events',
    element: <AdminEvents />,
  },
  {
    path: '/messages',
    element: <Messages />,
  },
  {
    path: '/messages/:id',
    element: <ChatRoom />,
  },
  {
    path: '/messages/direct/:userId',
    element: <DirectChat />,
  },
  {
    path: '/groups',
    element: <Groups />,
  },
  {
    path: '/groups/:id',
    element: <GroupDetail />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/profile/edit',
    element: <ProfileEdit />,
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
]);