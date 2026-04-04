/// Curated community categories (mobile `groups_mobile`). Stored in `category` (camelCase).
const List<String> kGroupCategories = [
  'Business & Entrepreneurship',
  'Marketing & Brand Growth',
  'Money, Funding & Resources',
  'Operations & Logistics',
  'Community & Networking',
  'Events & Opportunities',
  'Industry-Specific',
  'Wins, Lessons & Advice',
];

bool isAllowedGroupCategory(String? value) {
  if (value == null || value.trim().isEmpty) return true;
  return kGroupCategories.contains(value.trim());
}
