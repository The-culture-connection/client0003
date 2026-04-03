import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Opens a post thread on the root stack with a unique location so GoRouter
/// does not reuse the same [Page.key] for `/feed/post/:id` (which can block
/// opening the same post again right after returning from it).
void pushFeedPostDetail(BuildContext context, String postId) {
  final uri = Uri(
    path: '/feed/post/$postId',
    queryParameters: {'_': DateTime.now().millisecondsSinceEpoch.toString()},
  );
  context.push(uri.toString());
}
