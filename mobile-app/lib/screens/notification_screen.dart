import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../models/notification_model.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  String _activeFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'SECURITY':
        return const Color(0xFFEF4444);
      case 'DEPOSIT':
        return const Color(0xFF10B981);
      case 'TRANSFER':
        return const Color(0xFF436CF0);
      default:
        return const Color(0xFF8B5CF6);
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'SECURITY':
        return Icons.security_rounded;
      case 'DEPOSIT':
        return Icons.arrow_downward_rounded;
      case 'TRANSFER':
        return Icons.swap_horiz_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = context.watch<NotificationProvider>();
    final allNotifs = notifProvider.notifications;

    final filteredNotifs = allNotifs.where((n) {
      if (_activeFilter == 'UNREAD') return !n.isRead;
      if (_activeFilter == 'SECURITY') return n.category == 'SECURITY';
      if (_activeFilter == 'TRANSFER') return n.category == 'TRANSFER';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Notifications & Alerts',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => context.go('/home'),
        ),
        actions: [
          if (notifProvider.unreadCount > 0)
            TextButton.icon(
              onPressed: () => notifProvider.markAllAsRead(),
              icon: const Icon(Icons.done_all, size: 16, color: Color(0xFF436CF0)),
              label: const Text('Mark Read', style: TextStyle(color: Color(0xFF436CF0), fontSize: 12, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await notifProvider.fetchNotifications();
        },
        child: Column(
          children: [
            // Filter Chips
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildFilterChip('ALL', 'All (${allNotifs.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('UNREAD', 'Unread (${notifProvider.unreadCount})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('SECURITY', 'Security'),
                  const SizedBox(width: 8),
                  _buildFilterChip('TRANSFER', 'Transfers'),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Notifications List
            Expanded(
              child: filteredNotifs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.notifications_off_outlined, size: 48, color: const Color(0xFF94A3B8).withOpacity(0.6)),
                          const SizedBox(height: 12),
                          const Text('No notifications in this category', style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      itemCount: filteredNotifs.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final notif = filteredNotifs[index];
                        final catColor = _getCategoryColor(notif.category);

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: notif.isRead ? Colors.white : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: notif.isRead ? const Color(0xFFE2E8F0) : const Color(0xFFCBD5E1),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: catColor.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(_getCategoryIcon(notif.category), size: 20, color: catColor),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            notif.title,
                                            style: TextStyle(
                                              fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.bold,
                                              fontSize: 14,
                                              color: const Color(0xFF0F172A),
                                            ),
                                          ),
                                        ),
                                        if (!notif.isRead)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF436CF0),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      notif.message,
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      notif.createdAt.length >= 16
                                          ? notif.createdAt.substring(0, 16).replaceAll('T', ' ')
                                          : notif.createdAt,
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _activeFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _activeFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF436CF0) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF436CF0) : const Color(0xFFE2E8F0)),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }
}
