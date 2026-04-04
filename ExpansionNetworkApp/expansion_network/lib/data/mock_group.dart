/// Group row for the Groups list and group detail screens (category, activity, join state).
class MockGroup {
  const MockGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.members,
    required this.image,
    this.category = 'Industry',
    this.messagesToday = 0,
    this.joined = false,
  });

  final String id;
  final String name;
  final String description;
  final int members;
  final String image;
  final String category;
  final int messagesToday;
  final bool joined;
}
