/// Port of [UI Basis/src/app/data/mockData.ts]
library;

class MockUser {
  const MockUser({
    required this.id,
    required this.name,
    required this.avatar,
    required this.title,
    required this.organization,
    this.badges = const [],
    this.skillsOffered = const [],
    this.skillsNeeded = const [],
  });

  final String id;
  final String name;
  final String avatar;
  final String title;
  final String organization;
  final List<String> badges;
  final List<String> skillsOffered;
  final List<String> skillsNeeded;
}

class MockPostAuthor {
  const MockPostAuthor({
    required this.name,
    required this.avatar,
    required this.title,
    this.badge,
  });

  final String name;
  final String avatar;
  final String title;
  final String? badge;
}

class MockPost {
  const MockPost({
    required this.id,
    required this.author,
    required this.content,
    this.image,
    required this.timestamp,
    required this.likes,
    required this.comments,
  });

  final String id;
  final MockPostAuthor author;
  final String content;
  final String? image;
  final String timestamp;
  final int likes;
  final int comments;
}

class MockGroup {
  const MockGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.members,
    required this.image,
  });

  final String id;
  final String name;
  final String description;
  final int members;
  final String image;
}

class MockEvent {
  const MockEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
    required this.location,
    required this.image,
    required this.attendees,
    this.maxAttendees,
    this.status,
  });

  final String id;
  final String title;
  final String date;
  final String time;
  final String location;
  final String image;
  final int attendees;
  final int? maxAttendees;
  final String? status; // pending | approved | rejected
}

class MockMessage {
  const MockMessage({
    required this.id,
    required this.userName,
    required this.userAvatar,
    required this.lastMessage,
    required this.timestamp,
    this.unread = 0,
    this.isNewMatch = false,
  });

  final String id;
  final String userName;
  final String userAvatar;
  final String lastMessage;
  final String timestamp;
  final int unread;
  final bool isNewMatch;
}

final mockUsers = [
  MockUser(
    id: '1',
    name: 'Sarah Johnson',
    avatar:
        'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Senior Product Manager',
    organization: 'Google',
    badges: const ['leader', 'mentor'],
    skillsOffered: const ['Product Management', 'Strategy', 'Leadership'],
    skillsNeeded: const ['Data Science', 'iOS Development'],
  ),
  MockUser(
    id: '2',
    name: 'Michael Chen',
    avatar:
        'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    title: 'Lead Software Engineer',
    organization: 'Meta',
    badges: const ['expert', 'innovator'],
    skillsOffered: const ['React', 'Python', 'System Design'],
    skillsNeeded: const ['Marketing', 'Product Management'],
  ),
];

final mockPosts = [
  MockPost(
    id: '1',
    author: MockPostAuthor(
      name: 'Sarah Johnson',
      avatar:
          'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      title: 'Senior Product Manager at Google',
      badge: 'leader',
    ),
    content:
        'Just launched our new feature! Looking forward to hearing feedback from the community. This has been a 6-month journey with an amazing team. 🚀',
    image:
        'https://images.unsplash.com/photo-1515355252367-42ae86cb92f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    timestamp: '2 hours ago',
    likes: 124,
    comments: 18,
  ),
  MockPost(
    id: '2',
    author: MockPostAuthor(
      name: 'Michael Chen',
      avatar:
          'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      title: 'Lead Software Engineer at Meta',
      badge: 'expert',
    ),
    content:
        'Looking for someone interested in mentorship in React and system design. Free coffee on me! ☕ Let\'s connect and grow together.',
    timestamp: '5 hours ago',
    likes: 89,
    comments: 23,
  ),
];

final mockGroups = [
  MockGroup(
    id: '1',
    name: 'Tech Innovators',
    description:
        'A community for alumni working in tech and innovation. Share ideas, collaborate, and grow.',
    members: 1247,
    image:
        'https://images.unsplash.com/photo-1582005450386-52b25f82d9bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ),
  MockGroup(
    id: '2',
    name: 'Product Leaders',
    description:
        'For product managers and leaders to share best practices and insights.',
    members: 856,
    image:
        'https://images.unsplash.com/photo-1764726354739-1222d1ea5b63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ),
  MockGroup(
    id: '3',
    name: 'Design Thinking',
    description:
        'Exploring design, UX, and creative problem solving together.',
    members: 643,
    image:
        'https://images.unsplash.com/photo-1758691736975-9f7f643d178e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ),
];

final mockEvents = [
  MockEvent(
    id: '1',
    title: 'Annual Alumni Networking Gala',
    date: 'March 28, 2026',
    time: '6:00 PM',
    location: 'Grand Ballroom, Downtown',
    image:
        'https://images.unsplash.com/photo-1764471444363-e6dc0f9773bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    attendees: 234,
    status: 'approved',
  ),
  MockEvent(
    id: '2',
    title: 'Tech Career Workshop',
    date: 'April 5, 2026',
    time: '2:00 PM',
    location: 'Innovation Hub, Tech District',
    image:
        'https://images.unsplash.com/photo-1531058020387-3be344556be6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    attendees: 87,
  ),
  MockEvent(
    id: '3',
    title: 'Mentorship Mixer',
    date: 'April 12, 2026',
    time: '5:30 PM',
    location: 'Alumni Center',
    image:
        'https://images.unsplash.com/photo-1515355252367-42ae86cb92f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    attendees: 156,
    status: 'pending',
  ),
];

final mockMessages = [
  MockMessage(
    id: '1',
    userName: 'Sarah Johnson',
    userAvatar:
        'https://images.unsplash.com/photo-1701096351544-7de3c7fa0272?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    lastMessage:
        'Thanks for connecting! Would love to chat about product strategy.',
    timestamp: '10m ago',
    unread: 2,
    isNewMatch: true,
  ),
  MockMessage(
    id: '2',
    userName: 'Michael Chen',
    userAvatar:
        'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    lastMessage: 'See you at the networking event!',
    timestamp: '1h ago',
    unread: 0,
  ),
];
