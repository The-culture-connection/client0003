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
import Mortarverse from './pages/Mortarverse';
import ConferenceLobby from './pages/ConferenceLobby';
import ConferenceNetworking from './pages/ConferenceNetworking';
import ConferenceCommunity from './pages/ConferenceCommunity';
import ConferenceSchedule from './pages/ConferenceSchedule';
import ConferenceSponsors from './pages/ConferenceSponsors';
import ConferenceAnalytics from './pages/ConferenceAnalytics';
import ConferenceMessages from './pages/ConferenceMessages';
import ConferenceDirectMessage from './pages/ConferenceDirectMessage';
import SessionChat from './pages/SessionChat';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/mortarverse" replace />,
  },
  {
    path: '/mortarverse',
    element: <Mortarverse />,
  },
  {
    path: '/conference/lobby',
    element: <ConferenceLobby />,
  },
  {
    path: '/conference/networking',
    element: <ConferenceNetworking />,
  },
  {
    path: '/conference/community',
    element: <ConferenceCommunity />,
  },
  {
    path: '/conference/schedule',
    element: <ConferenceSchedule />,
  },
  {
    path: '/conference/sponsors',
    element: <ConferenceSponsors />,
  },
  {
    path: '/conference/analytics',
    element: <ConferenceAnalytics />,
  },
  {
    path: '/conference/messages',
    element: <ConferenceMessages />,
  },
  {
    path: '/conference/messages/:userId',
    element: <ConferenceDirectMessage />,
  },
  {
    path: '/conference/session/:sessionId',
    element: <SessionChat />,
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
    element: <Navigate to="/mortarverse" replace />,
  },
]);