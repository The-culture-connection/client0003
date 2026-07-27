import type { BadgeType } from '../components/Badge';

export const mockUsers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90fGVufDF8fHx8MTc3NDI2OTE5MHww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Senior Product Manager',
    organization: 'Google',
    badges: ['leader', 'mentor'] as BadgeType[],
    skillsOffered: ['Product Management', 'Strategy', 'Leadership'],
    skillsNeeded: ['Data Science', 'iOS Development'],
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzQzMDM4ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Lead Software Engineer',
    organization: 'Meta',
    badges: ['expert', 'innovator'] as BadgeType[],
    skillsOffered: ['React', 'Python', 'System Design'],
    skillsNeeded: ['Marketing', 'Product Management'],
  },
];

export const mockPosts = [
  {
    id: '1',
    author: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90fGVufDF8fHx8MTc3NDI2OTE5MHww&ixlib=rb-4.1.0&q=80&w=1080',
      title: 'Senior Product Manager at Google',
      badge: 'leader' as BadgeType,
    },
    content: 'Just launched our new feature! Looking forward to hearing feedback from the community. This has been a 6-month journey with an amazing team. 🚀',
    image: 'https://images.unsplash.com/photo-1515355252367-42ae86cb92f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwaW5ub3ZhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NzQyNzM2MjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    timestamp: '2 hours ago',
    likes: 124,
    comments: 18,
  },
  {
    id: '2',
    author: {
      name: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzQzMDM4ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
      title: 'Lead Software Engineer at Meta',
      badge: 'expert' as BadgeType,
    },
    content: 'Looking for someone interested in mentorship in React and system design. Free coffee on me! ☕ Let\'s connect and grow together.',
    timestamp: '5 hours ago',
    likes: 89,
    comments: 23,
  },
];

export const mockGroups = [
  {
    id: '1',
    name: 'Tech Innovators',
    description: 'A community for alumni working in tech and innovation. Share ideas, collaborate, and grow.',
    members: 1247,
    image: 'https://images.unsplash.com/photo-1582005450386-52b25f82d9bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwc3RhcnR1cCUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc3NDMwODQ1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '2',
    name: 'Product Leaders',
    description: 'For product managers and leaders to share best practices and insights.',
    members: 856,
    image: 'https://images.unsplash.com/photo-1764726354739-1222d1ea5b63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG5ldHdvcmtpbmclMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzc0MzA4NDUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: '3',
    name: 'Design Thinking',
    description: 'Exploring design, UX, and creative problem solving together.',
    members: 643,
    image: 'https://images.unsplash.com/photo-1758691736975-9f7f643d178e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwcHJvZmVzc2lvbmFsJTIwdGVhbXxlbnwxfHx8fDE3NzQzMDg0NTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export const mockEvents = [
  {
    id: '1',
    title: 'Annual Alumni Networking Gala',
    date: 'March 28, 2026',
    time: '6:00 PM',
    location: 'Grand Ballroom, Downtown',
    image: 'https://images.unsplash.com/photo-1764471444363-e6dc0f9773bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mZXJlbmNlJTIwZXZlbnQlMjBoYWxsfGVufDF8fHx8MTc3NDMwODQ1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    attendees: 234,
    status: 'approved' as const,
  },
  {
    id: '2',
    title: 'Tech Career Workshop',
    date: 'April 5, 2026',
    time: '2:00 PM',
    location: 'Innovation Hub, Tech District',
    image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXR3b3JraW5nJTIwZXZlbnQlMjBwZW9wbGV8ZW58MXx8fHwxNzc0MTk5NzQ5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    attendees: 87,
  },
  {
    id: '3',
    title: 'Mentorship Mixer',
    date: 'April 12, 2026',
    time: '5:30 PM',
    location: 'Alumni Center',
    image: 'https://images.unsplash.com/photo-1515355252367-42ae86cb92f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwaW5ub3ZhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NzQyNzM2MjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    attendees: 156,
    status: 'pending' as const,
  },
];

export const mockMessages = [
  {
    id: '1',
    user: {
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90fGVufDF8fHx8MTc3NDI2OTE5MHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Thanks for connecting! Would love to chat about product strategy.',
    timestamp: '10m ago',
    unread: 2,
    isNewMatch: true,
  },
  {
    id: '2',
    user: {
      name: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzQzMDM4ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'See you at the networking event!',
    timestamp: '1h ago',
    unread: 0,
  },
];
