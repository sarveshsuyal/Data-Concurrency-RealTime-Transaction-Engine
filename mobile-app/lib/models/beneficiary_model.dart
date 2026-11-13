class BeneficiaryModel {
  final String id;
  final String name;
  final String identifier; // email or account number
  final String note;

  const BeneficiaryModel({
    required this.id,
    required this.name,
    required this.identifier,
    this.note = '',
  });

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'U';
  }
}
