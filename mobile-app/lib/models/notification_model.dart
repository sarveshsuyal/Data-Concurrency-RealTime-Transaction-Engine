class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String category;
  final bool isRead;
  final String createdAt;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.category,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      title: json['title'] ?? 'System Notification',
      message: json['message'] ?? '',
      category: json['category'] ?? 'SYSTEM',
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] ?? '',
    );
  }

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      title: title,
      message: message,
      category: category,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}
