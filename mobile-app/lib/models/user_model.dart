class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String upiId;
  final String dateJoined;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.upiId = '',
    required this.dateJoined,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      fullName: json['full_name'] ?? '',
      role: json['role'] ?? 'USER',
      upiId: json['upi_id'] ?? '',
      dateJoined: json['date_joined'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'upi_id': upiId,
      'date_joined': dateJoined,
    };
  }
}
