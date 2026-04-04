import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models/group_thread_firestore.dart';
import '../services/group_thread_repository.dart';
import '../services/user_profile_repository.dart';
import '../theme/app_theme.dart';
import '../utils/staff_claims.dart';
import '../widgets/group_thread/firestore_thread_tile.dart';

/// Community hub (`groups_mobile`): each item in the list is a **thread** (like a Reddit post).
class GroupDetailScreen extends StatefulWidget {
  const GroupDetailScreen({required this.groupId, super.key});

  final String groupId;

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

enum _GroupTab { feed, members, about }

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  final _repo = GroupThreadRepository();
  final _users = UserProfileRepository();
  final _scroll = ScrollController();

  _GroupTab _tab = _GroupTab.feed;
  GroupThreadSort _sort = GroupThreadSort.newest;
  final List<FsGroupThread> _threads = [];
  QueryDocumentSnapshot<Map<String, dynamic>>? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  bool _showCreatePost = false;
  final _newTitle = TextEditingController();
  final _newBody = TextEditingController();
  bool _busyJoin = false;
  bool _headerAboutExpanded = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadFirstPage();
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _newTitle.dispose();
    _newBody.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading) return;
    final pos = _scroll.position;
    if (pos.pixels > pos.maxScrollExtent - 320) {
      _loadMore();
    }
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _threads.clear();
      _cursor = null;
      _hasMore = true;
    });
    try {
      final page = await _repo.fetchThreadsPage(
        groupId: widget.groupId,
        sort: _sort,
        limit: 15,
      );
      if (!mounted) return;
      setState(() {
        _threads.addAll(page.threads);
        _cursor = page.lastDoc;
        _hasMore = page.threads.length >= 15;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _repo.fetchThreadsPage(
        groupId: widget.groupId,
        sort: _sort,
        limit: 15,
        cursor: _cursor,
      );
      if (!mounted) return;
      setState(() {
        _threads.addAll(page.threads);
        _cursor = page.lastDoc;
        _hasMore = page.threads.length >= 15;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _onSort(GroupThreadSort s) async {
    if (_sort == s) return;
    setState(() => _sort = s);
    await _loadFirstPage();
  }

  Future<void> _join(FsGroup g) async {
    if (_busyJoin) return;
    setState(() => _busyJoin = true);
    try {
      final r = await _repo.joinGroup(widget.groupId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            r.pending ? 'Request sent — an admin will review.' : 'You joined ${g.name}.',
          ),
        ),
      );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busyJoin = false);
    }
  }

  Future<void> _leave(FsGroup g) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave group?'),
        content: Text('You will stop seeing posts in ${g.name}.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Leave')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await _repo.leaveGroup(widget.groupId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You left the group.')));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _submitPost() async {
    final body = _newBody.text.trim();
    if (body.isEmpty) return;
    try {
      await _repo.createThread(
        groupId: widget.groupId,
        title: _newTitle.text.trim().isEmpty ? null : _newTitle.text.trim(),
        body: body,
      );
      if (!mounted) return;
      setState(() {
        _showCreatePost = false;
        _newTitle.clear();
        _newBody.clear();
      });
      await _loadFirstPage();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return StreamBuilder<FsGroup?>(
      stream: _repo.watchGroup(widget.groupId),
      builder: (context, snap) {
        final g = snap.data;
        if (snap.connectionState == ConnectionState.waiting && g == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
        }
        if (g == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Group')),
            body: const Center(child: Text('Group not found or you cannot view it.')),
          );
        }

        final joined = g.isMember(uid);
        final pending = g.isPending(uid);

        return FutureBuilder<bool>(
          key: ValueKey<String>('manage-${g.id}-$uid-${g.createdBy}'),
          future: canManageMobileGroup(uid: uid, createdBy: g.createdBy),
          builder: (context, manageSnap) {
            final canManage = manageSnap.data == true;
            return Scaffold(
              backgroundColor: AppColors.background,
              body: SafeArea(
                child: Stack(
                  children: [
                    Column(
                      children: [
                        _header(g, joined, canManage),
                        Expanded(
                          child: switch (_tab) {
                            _GroupTab.feed => _feedTab(g, joined, pending),
                            _GroupTab.members => _membersTab(g),
                            _GroupTab.about => _aboutTab(g, joined),
                          },
                        ),
                      ],
                    ),
                    if (_showCreatePost) _createPostSheet(g.name),
                    if (joined && _tab == _GroupTab.feed && !_showCreatePost)
                      Positioned(
                        right: 20,
                        bottom: 24,
                        child: FloatingActionButton(
                          onPressed: () => setState(() => _showCreatePost = true),
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.onPrimary,
                          child: const Icon(Icons.add),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _header(FsGroup g, bool joined, bool canManage) {
    final about = (g.description ?? '').trim();
    final aboutLines = _headerAboutExpanded ? null : 4;
    return Material(
      color: AppColors.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.foreground),
                  onPressed: () => context.pop(),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        g.name,
                        style: const TextStyle(color: AppColors.foreground, fontSize: 20, fontWeight: FontWeight.w600),
                      ),
                      if (g.category != null && g.category!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            g.category!,
                            style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                      if (about.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          about,
                          maxLines: aboutLines,
                          overflow: aboutLines != null ? TextOverflow.ellipsis : null,
                          style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13, height: 1.4),
                        ),
                        if (about.length > 140 || about.split('\n').length > 3)
                          TextButton(
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              foregroundColor: AppColors.primary,
                            ),
                            onPressed: () => setState(() => _headerAboutExpanded = !_headerAboutExpanded),
                            child: Text(_headerAboutExpanded ? 'Show less' : 'Show full about'),
                          ),
                      ] else
                        const Padding(
                          padding: EdgeInsets.only(top: 6),
                          child: Text(
                            'No about text yet.',
                            style: TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
                if (canManage)
                  IconButton(
                    tooltip: 'Edit community',
                    icon: const Icon(Icons.edit_outlined, color: AppColors.foreground),
                    onPressed: () => context.push('/groups/${widget.groupId}/edit'),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _tabChip('Threads', _tab == _GroupTab.feed, () => setState(() => _tab = _GroupTab.feed)),
                const SizedBox(width: 8),
                _tabChip('Members', _tab == _GroupTab.members, () => setState(() => _tab = _GroupTab.members)),
                const SizedBox(width: 8),
                _tabChip('About', _tab == _GroupTab.about, () => setState(() => _tab = _GroupTab.about)),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
        ],
      ),
    );
  }

  Widget _tabChip(String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: Material(
        color: selected ? AppColors.primary : AppColors.secondary,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: selected ? AppColors.onPrimary : AppColors.mutedForeground,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _feedTab(FsGroup g, bool joined, bool pending) {
    if (pending) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Text(
            'Your request to join is pending admin approval.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.mutedForeground),
          ),
        ],
      );
    }
    if (!joined) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Text(
                  'Join this group',
                  style: TextStyle(color: AppColors.foreground, fontWeight: FontWeight.w600, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  g.status == 'Open'
                      ? 'Join to see posts and participate in discussions.'
                      : 'This group is closed. You can request to join.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _busyJoin ? null : () => _join(g),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                    child: _busyJoin
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Join Group'),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return CustomScrollView(
      controller: _scroll,
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                _sortChip('New', _sort == GroupThreadSort.newest, () => _onSort(GroupThreadSort.newest)),
                const SizedBox(width: 8),
                _sortChip('Top', _sort == GroupThreadSort.top, () => _onSort(GroupThreadSort.top)),
                const SizedBox(width: 8),
                _sortChip('Helpful', _sort == GroupThreadSort.helpful, () => _onSort(GroupThreadSort.helpful)),
              ],
            ),
          ),
        ),
        if (_loading)
          const SliverFillRemaining(
            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
          )
        else if (_threads.isEmpty)
          const SliverFillRemaining(
            child: Center(
              child: Text('No threads yet. Tap + to start one.', style: TextStyle(color: AppColors.mutedForeground)),
            ),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                if (i >= _threads.length) {
                  return _loadingMore
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                        )
                      : const SizedBox.shrink();
                }
                final t = _threads[i];
                return FirestoreThreadTile(
                  groupId: widget.groupId,
                  thread: t,
                  repo: _repo,
                );
              },
              childCount: _threads.length + (_loadingMore ? 1 : 0),
            ),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _sortChip(String label, bool selected, VoidCallback onTap) {
    return Material(
      color: selected ? AppColors.primary : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: selected ? AppColors.onPrimary : AppColors.mutedForeground,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _membersTab(FsGroup g) {
    final ids = g.memberIds;
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: ids.isEmpty ? 1 : ids.length + 1,
      itemBuilder: (context, i) {
        if (ids.isEmpty) {
          return const Text('No members yet.', style: TextStyle(color: AppColors.mutedForeground));
        }
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('Members (${ids.length})', style: const TextStyle(fontWeight: FontWeight.w600)),
          );
        }
        final memberUid = ids[i - 1];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Text(
                    memberUid.length >= 2 ? memberUid.substring(0, 2).toUpperCase() : '?',
                    style: const TextStyle(fontSize: 11, color: AppColors.onPrimary),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FutureBuilder<String>(
                    future: _users.getDisplayNameForUser(memberUid),
                    builder: (context, snap) {
                      final name = snap.data ?? 'Member';
                      return Text(name, style: const TextStyle(fontWeight: FontWeight.w500));
                    },
                  ),
                ),
                TextButton(
                  onPressed: memberUid == FirebaseAuth.instance.currentUser?.uid
                      ? null
                      : () => context.push('/messages/direct/$memberUid'),
                  child: const Text('Message'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _aboutTab(FsGroup g, bool joined) {
    final desc = g.description ?? 'No description yet.';
    final rules = g.rulesText ??
        'Be respectful, stay on topic, and support fellow members. Staff may remove content that violates community standards.';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('About', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Text(desc, style: const TextStyle(color: AppColors.mutedForeground, height: 1.45, fontSize: 14)),
              const SizedBox(height: 12),
              _kv('Category', g.category ?? '—'),
              _kv('Status', g.status),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Group rules', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Text(rules, style: const TextStyle(color: AppColors.mutedForeground, height: 1.5, fontSize: 14)),
            ],
          ),
        ),
        if (joined) ...[
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => _leave(g),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.foreground,
              side: const BorderSide(color: AppColors.border),
              minimumSize: const Size(double.infinity, 48),
            ),
            child: const Text('Leave Group'),
          ),
        ],
      ],
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 88, child: Text(k, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground))),
          Expanded(child: Text(v, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }

  Widget _createPostSheet(String groupName) {
    return Positioned.fill(
      child: GestureDetector(
        onTap: () => setState(() => _showCreatePost = false),
        child: Container(
          color: Colors.black54,
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () {},
            child: Material(
              color: AppColors.background,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('New thread', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                          IconButton(
                            icon: const Icon(Icons.close, color: AppColors.foreground),
                            onPressed: () => setState(() => _showCreatePost = false),
                          ),
                        ],
                      ),
                      Text('Posting to $groupName', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _newTitle,
                        style: const TextStyle(color: AppColors.foreground),
                        decoration: const InputDecoration(
                          hintText: 'Title (optional)',
                          filled: true,
                          fillColor: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _newBody,
                        maxLines: 6,
                        onChanged: (_) => setState(() {}),
                        style: const TextStyle(color: AppColors.foreground),
                        decoration: const InputDecoration(
                          hintText: 'What do you want to share?',
                          filled: true,
                          fillColor: AppColors.secondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => setState(() => _showCreatePost = false),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton(
                              onPressed: _newBody.text.trim().isEmpty ? null : _submitPost,
                              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                              child: const Text('Publish'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
