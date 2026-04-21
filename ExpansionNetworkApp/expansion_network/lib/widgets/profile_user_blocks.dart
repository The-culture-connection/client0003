import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../profile/profile_edit_sections.dart';
import '../profile/profile_utils.dart';
import '../theme/app_theme.dart';
import 'earned_badges_strip.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({super.key, required this.photoUrl, required this.initials});

  final String? photoUrl;
  final String initials;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 40,
      backgroundColor: AppColors.primary,
      backgroundImage: photoUrl != null ? CachedNetworkImageProvider(photoUrl!) : null,
      child: photoUrl == null
          ? Text(
              initials,
              style: const TextStyle(fontSize: 22, color: AppColors.onPrimary, fontWeight: FontWeight.bold),
            )
          : null,
    );
  }
}

class ProfileIdentitySection extends StatelessWidget {
  const ProfileIdentitySection({
    super.key,
    required this.data,
    required this.email,
    this.showEmail = true,
  });

  final Map<String, dynamic> data;
  final String email;
  final bool showEmail;

  @override
  Widget build(BuildContext context) {
    final bio = profileString(data['bio']);
    final profession = profileString(data['profession']);
    final city = profileString(data['city']);
    final state = profileString(data['state']);
    final location = [city, state].where((s) => s != null && s.isNotEmpty).join(', ');
    final notInCohort = data['not_in_cohort'] == true;
    final cohortId = profileString(data['cohort_id']);
    final gradProgram = profileString(data['graduated_city_program']);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (bio != null && bio.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(bio, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground, height: 1.4)),
          ),
        if (profession != null) _kv('Profession', profession),
        if (location.isNotEmpty) _kv('Location', location),
        _kv('Cohort', notInCohort ? 'Not in a cohort' : (cohortId ?? '—')),
        if (gradProgram != null) _kv('City program graduated', gradProgram),
        if (showEmail) _kv('Email', email.isEmpty ? '—' : email),
      ],
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(k, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
          ),
          Expanded(child: Text(v, style: const TextStyle(fontSize: 13, color: AppColors.foreground))),
        ],
      ),
    );
  }
}

class ProfileLinksSection extends StatelessWidget {
  const ProfileLinksSection({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final pl = data['profile_links'];
    final keys = ['linkedin', 'portfolio', 'instagram', 'facebook', 'tiktok'];
    final labels = {
      'linkedin': 'LinkedIn',
      'portfolio': 'Portfolio',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'tiktok': 'TikTok',
    };
    if (pl is! Map) {
      return const Text('—', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground));
    }
    final rows = <Widget>[];
    for (final k in keys) {
      final v = profileString(pl[k]);
      if (v != null && v.isNotEmpty) {
        rows.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 88,
                  child: Text(labels[k]!, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                ),
                Expanded(child: Text(v, style: const TextStyle(fontSize: 13, color: AppColors.foreground))),
              ],
            ),
          ),
        );
      }
    }
    if (rows.isEmpty) {
      return const Text('No links added.', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
  }
}

class ProfileAchievementsCard extends StatelessWidget {
  const ProfileAchievementsCard({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final points = data['points'];
    int balance = 0;
    if (points is Map && points['balance'] is int) {
      balance = points['balance'] as int;
    } else if (points is Map && points['balance'] is num) {
      balance = (points['balance'] as num).toInt();
    }

    final badges = data['badges'];
    int badgeCount = 0;
    if (badges is Map) {
      final earned = badges['earned'];
      if (earned is List) badgeCount = earned.length;
    }

    final confident = data['confident_skills'];
    final desired = data['desired_skills'];
    final nConfident = confident is List ? confident.length : 0;
    final nDesired = desired is List ? desired.length : 0;

    final stats = [
      ('$balance', 'Points'),
      ('$badgeCount', 'Badges'),
      ('$nConfident', 'Skills offered'),
      ('$nDesired', 'Skills seeking'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Achievements', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(
            'From your curriculum activity',
            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 12),
          EarnedBadgesStrip(profileData: data),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.8,
            children: [
              for (final s in stats)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(s.$1, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                      Text(s.$2, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileCertificatesPlaceholderCard extends StatelessWidget {
  const ProfileCertificatesPlaceholderCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Certificates', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text(
            'Course certificates from the digital curriculum will appear here when available.',
            style: TextStyle(fontSize: 13, color: AppColors.mutedForeground.withValues(alpha: 0.9)),
          ),
        ],
      ),
    );
  }
}

Widget profileWorkStructureRows(Map<String, dynamic> data) {
  final ws = data['work_structure'];
  int flex = 5, hours = 40, own = 5;
  if (ws is Map) {
    flex = _intFrom(ws['flexibility'], 5).clamp(1, 10);
    hours = _intFrom(ws['weekly_hours'], 40).clamp(20, 80);
    own = _intFrom(ws['ownership'], 5).clamp(1, 10);
  }
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _workRow('Flexibility', flexibilityLabel(flex)),
      _workRow('Weekly hours', '$hours hours/week'),
      _workRow('Ownership', ownershipLabel(own)),
    ],
  );
}

Widget _workRow(String label, String value) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13, color: AppColors.foreground))),
      ],
    ),
  );
}

int _intFrom(dynamic v, int fallback) {
  if (v is int) return v;
  if (v is num) return v.round();
  return fallback;
}
