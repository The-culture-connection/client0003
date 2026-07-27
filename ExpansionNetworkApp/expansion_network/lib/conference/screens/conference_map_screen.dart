import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../current_conference_holder.dart';
import '../models/conference_floor.dart';
import '../models/conference_session.dart';
import '../models/conference_sponsor.dart';
import '../services/conference_repository.dart';
import '../theme/conference_colors.dart';

/// Venue Map — interactive floor plan(s) with a floor toggle, zoomable image,
/// room pins overlaid at normalized (0–1) positions, a real room legend, and
/// tap-a-pin → the sessions in that room → the session detail.
class ConferenceMapScreen extends StatefulWidget {
  const ConferenceMapScreen({super.key, this.initialFloorId, this.highlightRoomId});

  final String? initialFloorId;
  final String? highlightRoomId;

  @override
  State<ConferenceMapScreen> createState() => _ConferenceMapScreenState();
}

class _ConferenceMapScreenState extends State<ConferenceMapScreen> with SingleTickerProviderStateMixin {
  final ConferenceRepository _repo = ConferenceRepository();

  StreamSubscription<List<ConferenceFloor>>? _floorsSub;
  StreamSubscription<List<ConferenceSession>>? _sessionsSub;
  StreamSubscription<List<ConferenceSponsor>>? _sponsorsSub;
  late final AnimationController _pulse;

  List<ConferenceFloor> _floors = const [];
  List<ConferenceSession> _sessions = const [];
  List<ConferenceSponsor> _sponsors = const [];
  String? _selectedFloorId;
  String? _highlightRoomId;
  double? _aspect; // intrinsic aspect ratio of the current floor image
  String? _aspectForUrl;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _highlightRoomId = widget.highlightRoomId;
    _selectedFloorId = widget.initialFloorId;
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

    final cid = CurrentConferenceHolder.instance.conferenceId;
    if (cid != null) {
      _floorsSub = _repo.watchFloors(cid).listen((floors) {
        if (!mounted) return;
        setState(() {
          _floors = floors;
          _loaded = true;
          _selectedFloorId ??= floors.isNotEmpty ? floors.first.id : null;
          if (_selectedFloorId != null && !floors.any((f) => f.id == _selectedFloorId)) {
            _selectedFloorId = floors.isNotEmpty ? floors.first.id : null;
          }
        });
        _resolveAspectForSelected();
      });
      _sessionsSub = _repo.watchSessions(cid).listen((s) {
        if (mounted) setState(() => _sessions = s);
      });
      _sponsorsSub = _repo.watchSponsors(cid).listen((s) {
        if (mounted) setState(() => _sponsors = s);
      });
    } else {
      _loaded = true;
    }
  }

  @override
  void dispose() {
    _floorsSub?.cancel();
    _sessionsSub?.cancel();
    _sponsorsSub?.cancel();
    _pulse.dispose();
    super.dispose();
  }

  ConferenceFloor? get _selectedFloor {
    for (final f in _floors) {
      if (f.id == _selectedFloorId) return f;
    }
    return _floors.isNotEmpty ? _floors.first : null;
  }

  void _resolveAspectForSelected() {
    final url = _selectedFloor?.imageUrl;
    if (url == null || url.isEmpty || url == _aspectForUrl) return;
    _aspectForUrl = url;
    _aspect = null;
    final provider = NetworkImage(url);
    final stream = provider.resolve(const ImageConfiguration());
    late final ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      if (mounted && url == _selectedFloor?.imageUrl) {
        setState(() => _aspect = info.image.width / info.image.height);
      }
      stream.removeListener(listener);
    }, onError: (_, __) => stream.removeListener(listener));
    stream.addListener(listener);
  }

  void _selectFloor(String id) {
    setState(() {
      _selectedFloorId = id;
      _highlightRoomId = null; // clear highlight when switching floors
    });
    _resolveAspectForSelected();
  }

  List<ConferenceSession> _sessionsForRoom(String roomId) {
    final list = _sessions.where((s) => s.mapRoomId == roomId).toList();
    list.sort((a, b) => (a.startTime?.millisecondsSinceEpoch ?? 0).compareTo(b.startTime?.millisecondsSinceEpoch ?? 0));
    return list;
  }

  List<ConferenceSponsor> _sponsorsForRoom(String roomId) {
    final list = _sponsors.where((s) => s.mapRoomId == roomId).toList();
    list.sort((a, b) => a.companyName.toLowerCase().compareTo(b.companyName.toLowerCase()));
    return list;
  }

  void _openRoom(MapRoom room) {
    final sessions = _sessionsForRoom(room.id);
    final sponsors = _sponsorsForRoom(room.id);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: ConferenceColors.atmosphere,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.place_rounded, color: ConferenceColors.gold),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(room.name,
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (sessions.isEmpty && sponsors.isEmpty)
                Text('Nothing scheduled here yet.', style: TextStyle(color: Colors.grey.shade400)),
              if (sessions.isNotEmpty) ...[
                _sheetLabel('SESSIONS'),
                const SizedBox(height: 8),
                ...sessions.map((s) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _roomSessionTile(ctx, s))),
              ],
              if (sponsors.isNotEmpty) ...[
                const SizedBox(height: 8),
                _sheetLabel('SPONSORS'),
                const SizedBox(height: 8),
                ...sponsors.map((sp) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _roomSponsorTile(ctx, sp))),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _sheetLabel(String text) => Text(text,
      style: const TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.w800, letterSpacing: 1, fontSize: 12));

  Widget _roomSponsorTile(BuildContext sheetCtx, ConferenceSponsor sp) {
    return Material(
      color: Colors.white.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.of(sheetCtx).pop();
          context.push('/conference/sponsor/${sp.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: ConferenceColors.goldAlpha(0.18),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: ConferenceColors.goldAlpha(0.5)),
                ),
                child: (sp.logoUrl != null && sp.logoUrl!.isNotEmpty)
                    ? Image.network(sp.logoUrl!, width: 34, height: 34, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Text(sp.initials, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)))
                    : Text(sp.initials, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(sp.companyName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    if (sp.packageLevel.trim().isNotEmpty)
                      Text(sp.packageLevel, style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: ConferenceColors.gold),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roomSessionTile(BuildContext sheetCtx, ConferenceSession s) {
    final time = s.startTime != null
        ? DateFormat('EEE, MMM d • h:mm a').format(s.startTime!)
        : 'Time TBD';
    return Material(
      color: Colors.white.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.of(sheetCtx).pop();
          context.push('/conference/schedule/${s.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(time, style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: ConferenceColors.gold),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final floor = _selectedFloor;
    return Scaffold(
      backgroundColor: ConferenceColors.background,
      appBar: AppBar(
        backgroundColor: ConferenceColors.atmosphere,
        foregroundColor: ConferenceColors.gold,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/conference/lobby'),
        ),
        title: const Text('VENUE MAP', style: TextStyle(letterSpacing: 1, fontWeight: FontWeight.w800)),
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator(color: ConferenceColors.gold))
          : floor == null || (floor.imageUrl == null || floor.imageUrl!.isEmpty)
              ? Center(
                  child: Text('No venue map has been published yet.',
                      style: TextStyle(color: Colors.grey.shade400)))
              : Column(
                  children: [
                    if (_floors.length > 1) _floorToggle(),
                    Expanded(child: _mapArea(floor)),
                    _legend(floor),
                  ],
                ),
    );
  }

  Widget _floorToggle() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          for (final f in _floors) ...[
            GestureDetector(
              onTap: () => _selectFloor(f.id),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                decoration: BoxDecoration(
                  color: _selectedFloorId == f.id ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _selectedFloorId == f.id ? ConferenceColors.gold : Colors.white.withValues(alpha: 0.1),
                  ),
                ),
                child: Text(
                  f.name.toUpperCase(),
                  style: TextStyle(
                    color: _selectedFloorId == f.id ? Colors.black : Colors.grey.shade400,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _mapArea(ConferenceFloor floor) {
    final aspect = _aspect;
    if (aspect == null) {
      return const Center(child: CircularProgressIndicator(color: ConferenceColors.gold));
    }
    return Padding(
      padding: const EdgeInsets.all(12),
      child: InteractiveViewer(
        minScale: 1,
        maxScale: 5,
        child: Center(
          child: AspectRatio(
            aspectRatio: aspect,
            child: LayoutBuilder(
              builder: (context, c) {
                final w = c.maxWidth;
                final h = c.maxHeight;
                return Stack(
                  children: [
                    Positioned.fill(
                      child: Image.network(
                        floor.imageUrl!,
                        fit: BoxFit.fill,
                        errorBuilder: (_, __, ___) => Center(
                          child: Text('Could not load the floor plan.', style: TextStyle(color: Colors.grey.shade500)),
                        ),
                      ),
                    ),
                    for (final room in floor.rooms)
                      Positioned(
                        left: (room.x * w) - 18,
                        top: (room.y * h) - 34,
                        child: _pin(room),
                      ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _pin(MapRoom room) {
    final highlighted = room.id == _highlightRoomId;
    final dot = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: ConferenceColors.goldAlpha(highlighted ? 1 : 0.5)),
          ),
          child: Text(
            room.name,
            style: TextStyle(
              color: highlighted ? ConferenceColors.gold : Colors.white,
              fontSize: 9,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const Icon(Icons.location_on, color: ConferenceColors.gold, size: 22),
      ],
    );

    final tappable = GestureDetector(onTap: () => _openRoom(room), child: dot);
    if (!highlighted) return tappable;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) => Transform.scale(scale: 1 + 0.18 * _pulse.value, child: child),
      child: tappable,
    );
  }

  Widget _legend(ConferenceFloor floor) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 168),
      width: double.infinity,
      decoration: BoxDecoration(
        color: ConferenceColors.atmosphere,
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
            child: Text('ROOMS (${floor.rooms.length})',
                style: const TextStyle(color: ConferenceColors.gold, fontWeight: FontWeight.w800, letterSpacing: 1, fontSize: 12)),
          ),
          if (floor.rooms.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Text('No rooms labeled on this floor.', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
            )
          else
            Flexible(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                itemCount: floor.rooms.length,
                itemBuilder: (context, i) {
                  final room = floor.rooms[i];
                  final sc = _sessionsForRoom(room.id).length;
                  final pc = _sponsorsForRoom(room.id).length;
                  final parts = <String>[
                    if (sc > 0) '$sc session${sc == 1 ? '' : 's'}',
                    if (pc > 0) '$pc sponsor${pc == 1 ? '' : 's'}',
                  ];
                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => _openRoom(room),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        child: Row(
                          children: [
                            const Icon(Icons.location_on, color: ConferenceColors.gold, size: 16),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(room.name,
                                  style: const TextStyle(color: Colors.white, fontSize: 13), overflow: TextOverflow.ellipsis),
                            ),
                            Text(parts.isEmpty ? '—' : parts.join(' · '),
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                            const SizedBox(width: 4),
                            const Icon(Icons.chevron_right_rounded, color: ConferenceColors.gold, size: 18),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
