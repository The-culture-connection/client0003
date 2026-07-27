/// A room pin on a floor plan. `x`/`y` are normalized 0–1 so they survive resizing.
class MapRoom {
  const MapRoom({required this.id, required this.name, required this.x, required this.y});

  final String id;
  final String name;
  final double x;
  final double y;

  static MapRoom? fromMap(Map<String, dynamic> data) {
    final id = data['id'];
    if (id is! String) return null;
    return MapRoom(
      id: id,
      name: data['name'] as String? ?? 'Room',
      x: (data['x'] as num?)?.toDouble() ?? 0,
      y: (data['y'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// `conferences/{conferenceId}/floors/{floorId}` — a floor plan image + its room pins.
class ConferenceFloor {
  const ConferenceFloor({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.order,
    required this.rooms,
  });

  final String id;
  final String name;
  final String? imageUrl;
  final int order;
  final List<MapRoom> rooms;

  MapRoom? roomById(String? roomId) {
    if (roomId == null) return null;
    for (final r in rooms) {
      if (r.id == roomId) return r;
    }
    return null;
  }

  static ConferenceFloor? fromDoc(String id, Map<String, dynamic>? data) {
    if (data == null) return null;
    final rawRooms = data['rooms'] as List<dynamic>? ?? const [];
    return ConferenceFloor(
      id: id,
      name: data['name'] as String? ?? 'Floor',
      imageUrl: data['imageUrl'] as String?,
      order: (data['order'] as num?)?.toInt() ?? 0,
      rooms: rawRooms
          .whereType<Map<String, dynamic>>()
          .map(MapRoom.fromMap)
          .whereType<MapRoom>()
          .toList(),
    );
  }
}
