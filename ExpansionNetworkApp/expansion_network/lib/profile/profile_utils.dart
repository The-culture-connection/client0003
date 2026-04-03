import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

String? profileString(dynamic v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
}

String profileDisplayName(Map<String, dynamic> d) {
  final fn = profileString(d['first_name']) ?? profileString(d['firstName']);
  final ln = profileString(d['last_name']) ?? profileString(d['lastName']);
  final combined = '${fn ?? ''} ${ln ?? ''}'.trim();
  if (combined.isNotEmpty) return combined;
  return profileString(d['display_name']) ?? 'Member';
}

String profileInitials(Map<String, dynamic> d) {
  final fn = profileString(d['first_name']) ?? profileString(d['firstName']);
  final ln = profileString(d['last_name']) ?? profileString(d['lastName']);
  final a = (fn != null && fn.isNotEmpty) ? fn[0] : '';
  final b = (ln != null && ln.isNotEmpty) ? ln[0] : '';
  final s = (a + b).toUpperCase();
  if (s.isNotEmpty) return s;
  final email = profileString(d['email']) ?? '';
  if (email.length >= 2) return email.substring(0, 2).toUpperCase();
  return '?';
}

String? profileCohortSubtitle(Map<String, dynamic> d) {
  final notIn = d['not_in_cohort'];
  if (notIn == true) return 'Not in a cohort';
  final cid = profileString(d['cohort_id']);
  if (cid != null) return 'Cohort: $cid';
  return null;
}

List<String> profileStringList(dynamic v) {
  if (v is! List) return [];
  return v.whereType<String>().where((s) => s.trim().isNotEmpty).toList();
}

List<Widget> profileRoleAndBadgeChips(Map<String, dynamic> d) {
  final chips = <Widget>[];
  final roles = d['roles'];
  if (roles is List) {
    for (final r in roles) {
      if (r is String && r.isNotEmpty) {
        chips.add(profileChip(r, filled: true));
      }
    }
  }
  if (chips.isEmpty) {
    chips.add(profileChip('Member', filled: true));
  }

  final badges = d['badges'];
  if (badges is Map) {
    final visible = badges['visible'];
    if (visible is List) {
      for (final b in visible) {
        if (b is String && b.isNotEmpty) {
          chips.add(profileChip(b, filled: false));
        }
      }
    }
  }
  return chips;
}

Widget profileChip(String text, {required bool filled}) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: filled ? AppColors.primary : AppColors.primary.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 11,
        color: filled ? AppColors.onPrimary : AppColors.primary,
      ),
    ),
  );
}
