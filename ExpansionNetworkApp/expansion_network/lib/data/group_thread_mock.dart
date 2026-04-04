/// Reddit-style thread models + seed data (UI `GroupDetail.tsx` prototype).
library;

class ThreadAuthorM {
  const ThreadAuthorM({
    required this.name,
    required this.avatar,
    required this.role,
  });

  final String name;
  final String avatar;
  final String role;
}

class ThreadCommentM {
  ThreadCommentM({
    required this.id,
    required this.authorName,
    required this.authorAvatar,
    required this.content,
    required this.timestamp,
    required this.upvotes,
    this.userVote,
    this.collapsed = false,
    List<ThreadCommentM>? replies,
  }) : replies = replies ?? [];

  final int id;
  final String authorName;
  final String authorAvatar;
  String content;
  String timestamp;
  int upvotes;
  String? userVote;
  bool collapsed;
  final List<ThreadCommentM> replies;
}

class GroupThreadPostM {
  GroupThreadPostM({
    required this.id,
    required this.author,
    this.title,
    required this.content,
    required this.timestamp,
    required this.upvotes,
    this.userVote,
    required this.sortOrder,
    List<ThreadCommentM>? comments,
  }) : comments = comments ?? [];

  final int id;
  final ThreadAuthorM author;
  final String? title;
  String content;
  String timestamp;
  int upvotes;
  String? userVote;
  final int sortOrder;
  final List<ThreadCommentM> comments;
}

class GroupMemberM {
  const GroupMemberM({
    required this.id,
    required this.name,
    required this.role,
    required this.avatar,
    this.isAdmin = false,
  });

  final int id;
  final String name;
  final String role;
  final String avatar;
  final bool isAdmin;
}

/// Thread + member seed aligned with [UI/src/app/pages/GroupDetail.tsx].
List<GroupThreadPostM> seedGroupThreads() {
  return [
    GroupThreadPostM(
      id: 1,
      sortOrder: 1,
      author: ThreadAuthorM(
        name: 'Sarah Johnson',
        avatar: 'SJ',
        role: 'Alumni • Class of 2024',
      ),
      title: 'We just secured Series A funding! 🚀',
      content:
          'Excited to share that our startup just secured Series A funding! Thanks to everyone in this group for the support and advice throughout this journey. Happy to answer any questions about the process!',
      timestamp: '2h ago',
      upvotes: 342,
      userVote: null,
      comments: [
        ThreadCommentM(
          id: 1,
          authorName: 'Michael Chen',
          authorAvatar: 'MC',
          content:
              'Congratulations Sarah! Well deserved! How long did the fundraising process take?',
          timestamp: '1h ago',
          upvotes: 45,
          userVote: 'up',
          replies: [
            ThreadCommentM(
              id: 11,
              authorName: 'Sarah Johnson',
              authorAvatar: 'SJ',
              content:
                  "Thanks Michael! It took about 4 months from initial outreach to closing. Happy to share more details if you're interested.",
              timestamp: '1h ago',
              upvotes: 23,
              userVote: null,
            ),
          ],
        ),
        ThreadCommentM(
          id: 2,
          authorName: 'Emily Rodriguez',
          authorAvatar: 'ER',
          content:
              "This is amazing news! Let's celebrate soon! What was the biggest challenge during the fundraising?",
          timestamp: '1h ago',
          upvotes: 28,
          userVote: null,
        ),
        ThreadCommentM(
          id: 3,
          authorName: 'David Park',
          authorAvatar: 'DP',
          content: 'Congrats! Any tips for someone just starting their fundraising journey?',
          timestamp: '45m ago',
          upvotes: 12,
          userVote: null,
        ),
      ],
    ),
    GroupThreadPostM(
      id: 2,
      sortOrder: 2,
      author: ThreadAuthorM(
        name: 'Alex Thompson',
        avatar: 'AT',
        role: 'Entrepreneur • Class of 2023',
      ),
      title: 'Looking for a technical co-founder',
      content:
          'Building a fintech startup focused on SMB payments. Looking for a technical co-founder with experience in payment systems and security. Anyone interested in discussing opportunities? DM me!',
      timestamp: '5h ago',
      upvotes: 156,
      userVote: 'up',
      comments: [
        ThreadCommentM(
          id: 4,
          authorName: 'Jessica Lee',
          authorAvatar: 'JL',
          content: 'What tech stack are you planning to use?',
          timestamp: '4h ago',
          upvotes: 8,
          userVote: null,
          replies: [
            ThreadCommentM(
              id: 12,
              authorName: 'Alex Thompson',
              authorAvatar: 'AT',
              content:
                  'Planning to use Node.js/TypeScript on the backend with React for the frontend. Considering Stripe for payment processing.',
              timestamp: '4h ago',
              upvotes: 5,
              userVote: null,
            ),
          ],
        ),
      ],
    ),
  ];
}

List<GroupMemberM> seedGroupMembers() {
  return const [
    GroupMemberM(id: 1, name: 'Sarah Johnson', role: 'Alumni • Class of 2024', avatar: 'SJ', isAdmin: true),
    GroupMemberM(id: 2, name: 'Michael Chen', role: 'Entrepreneur • Class of 2023', avatar: 'MC'),
    GroupMemberM(id: 3, name: 'Emily Rodriguez', role: 'Startup Founder • Class of 2022', avatar: 'ER'),
    GroupMemberM(id: 4, name: 'Alex Thompson', role: 'Tech Lead • Class of 2023', avatar: 'AT'),
    GroupMemberM(id: 5, name: 'Jessica Lee', role: 'Product Manager • Class of 2024', avatar: 'JL'),
    GroupMemberM(id: 6, name: 'David Park', role: 'Designer • Class of 2023', avatar: 'DP'),
  ];
}
