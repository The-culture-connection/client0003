import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
/// Port of [UI Basis/src/app/pages/Matching.tsx]
class MatchingScreen extends StatefulWidget {
  const MatchingScreen({super.key});

  @override
  State<MatchingScreen> createState() => _MatchingScreenState();
}

class _MatchingScreenState extends State<MatchingScreen> {
  bool _isMatching = false;
  _MatchResults? _results;

  Future<void> _runMatching() async {
    setState(() {
      _isMatching = true;
      _results = null;
    });
    await Future<void>.delayed(const Duration(seconds: 3));
    if (!mounted) return;
    setState(() {
      _isMatching = false;
      _results = const _MatchResults(jobs: 12, connections: 8, score: 94);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back, color: AppColors.mutedForeground),
                          onPressed: () => context.pop(),
                        ),
                        Expanded(
                          child: Text(
                            'Smart Matching',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(left: 48),
                      child: Text(
                        'AI-powered algorithm to find your perfect connections',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.85)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.auto_awesome, size: 48, color: AppColors.onPrimary),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Discover Your Perfect Matches',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.onPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Our advanced AI algorithm analyzes your profile, interests, and career goals to find the best opportunities and connections for you.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: AppColors.onPrimary.withValues(alpha: 0.9)),
                      ),
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
                      const Text('How It Works', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 16),
                      _howRow(Icons.psychology_outlined, 'AI Analysis', 'We analyze your profile, skills, and preferences'),
                      _howRow(Icons.track_changes, 'Smart Matching', 'Find opportunities that align with your goals'),
                      _howRow(Icons.people_outline, 'Connect & Grow', 'Build meaningful connections with alumni and professionals'),
                    ],
                  ),
                ),
                if (_results != null && !_isMatching) ...[
                  const SizedBox(height: 16),
                  _ResultsCard(
                    results: _results!,
                    onViewMatches: () => context.go('/explore'),
                  ),
                ],
                if (_results == null) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.all(16),
                      ),
                      onPressed: _isMatching ? null : _runMatching,
                      icon: _isMatching
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                            )
                          : const Icon(Icons.auto_awesome),
                      label: Text(_isMatching ? 'Running Algorithm...' : 'Start Matching'),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Text(
                    '💡 Run matching weekly to discover new opportunities as they become available',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppColors.mutedForeground),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    ),
    );
  }

  Widget _howRow(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchResults {
  const _MatchResults({required this.jobs, required this.connections, required this.score});

  final int jobs;
  final int connections;
  final int score;
}

class _ResultsCard extends StatelessWidget {
  const _ResultsCard({required this.results, required this.onViewMatches});

  final _MatchResults results;
  final VoidCallback onViewMatches;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.trending_up, color: AppColors.primary),
              SizedBox(width: 8),
              Text('Match Results', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _resultCell('${results.jobs}', 'Job Matches'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _resultCell('${results.connections}', 'Connections'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Match Score', style: TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
                    Text('${results.score}%', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: results.score / 100,
                    minHeight: 8,
                    backgroundColor: AppColors.secondary,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onViewMatches,
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('View Matches'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _resultCell(String value, String label) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
        ],
      ),
    );
  }
}
