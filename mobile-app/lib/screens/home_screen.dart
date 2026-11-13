import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/account_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/transaction_detail_sheet.dart';
import '../widgets/receive_money_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AccountProvider>().fetchAccounts();
      context.read<AccountProvider>().fetchTransactions();
      context.read<AuthProvider>().sendHeartbeat();
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return const Color(0xFF10B981);
      case 'REVERSED':
        return const Color(0xFF8B5CF6);
      case 'FAILED':
        return const Color(0xFFEF4444);
      case 'ROLLED_BACK':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF3B82F6);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final accountProvider = context.watch<AccountProvider>();
    final notifProvider = context.watch<NotificationProvider>();
    final account = accountProvider.primaryAccount;
    final transactions = accountProvider.recentTransactions;
    final isBalanceVisible = accountProvider.isBalanceVisible;

    // Calculate quick stats from recent transactions
    double recentCredits = 0.0;
    double recentDebits = 0.0;
    for (final tx in transactions) {
      final amt = double.tryParse(tx.amount) ?? 0.0;
      if (tx.receiverAccountNumber == account?.accountNumber) {
        recentCredits += amt;
      } else {
        recentDebits += amt;
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF436CF0).withOpacity(0.15),
              child: Text(
                auth.user?.fullName.isNotEmpty == true ? auth.user!.fullName[0].toUpperCase() : 'U',
                style: const TextStyle(color: Color(0xFF436CF0), fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  auth.user?.fullName ?? 'Customer',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Connected Ledger',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Notification Bell with Badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Color(0xFF0F172A)),
                onPressed: () => context.go('/notifications'),
              ),
              if (notifProvider.unreadCount > 0)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${notifProvider.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, color: Color(0xFF0F172A)),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await accountProvider.fetchAccounts();
          await accountProvider.fetchTransactions();
          await notifProvider.fetchNotifications();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Balance Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2B4FE5), Color(0xFF4F46E5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2B4FE5).withOpacity(0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Available Balance',
                              style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => accountProvider.toggleBalanceVisibility(),
                              child: Icon(
                                isBalanceVisible ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                size: 16,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.shield_outlined, size: 12, color: Colors.white),
                              SizedBox(width: 4),
                              Text('Strict Locks', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isBalanceVisible ? '₹${account?.balance ?? '0.00'}' : '₹••••••',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              account?.accountNumber ?? 'DC-XXXX-XXXX',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 14, color: Colors.white70),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                if (account?.accountNumber != null) {
                                  Clipboard.setData(ClipboardData(text: account!.accountNumber));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Account number copied to clipboard!')),
                                  );
                                }
                              },
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'CURRENCY: ${account?.currency ?? 'INR'}',
                            style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 4 Quick Action Buttons
              Row(
                children: [
                  Expanded(
                    child: _buildActionItem(
                      icon: Icons.send_rounded,
                      label: 'Send',
                      color: const Color(0xFF436CF0),
                      onTap: () => context.go('/transfer'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionItem(
                      icon: Icons.qr_code_2_rounded,
                      label: 'Receive',
                      color: const Color(0xFF10B981),
                      onTap: () {
                        if (account != null) {
                          ReceiveMoneySheet.show(context, account);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Account loading... please wait')),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionItem(
                      icon: Icons.pie_chart_outline_rounded,
                      label: 'Statement',
                      color: const Color(0xFF8B5CF6),
                      onTap: () => context.go('/statement'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionItem(
                      icon: Icons.history_rounded,
                      label: 'History',
                      color: const Color(0xFF0F172A),
                      onTap: () => context.go('/history'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Quick Flow Insights Summary Banner
              if (transactions.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.arrow_downward, size: 14, color: Color(0xFF10B981)),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Inflow', style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                              Text('+₹${recentCredits.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                            ],
                          ),
                        ],
                      ),
                      Container(height: 24, width: 1, color: const Color(0xFFE2E8F0)),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.arrow_upward, size: 14, color: Color(0xFFEF4444)),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Outflow', style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                              Text('-₹${recentDebits.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEF4444))),
                            ],
                          ),
                        ],
                      ),
                      Container(height: 24, width: 1, color: const Color(0xFFE2E8F0)),
                      GestureDetector(
                        onTap: () => context.go('/statement'),
                        child: const Row(
                          children: [
                            Text('Ledger', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF436CF0))),
                            Icon(Icons.chevron_right, size: 16, color: Color(0xFF436CF0)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Recent Transactions Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Transactions',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  TextButton(
                    onPressed: () => context.go('/history'),
                    child: const Text('View All', style: TextStyle(color: Color(0xFF436CF0), fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Transactions List
              if (accountProvider.isLoading && transactions.isEmpty)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else if (transactions.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Center(
                    child: Text('No transactions yet. Send your first transfer!', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: transactions.take(6).length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final tx = transactions[index];
                    final isDebit = tx.senderAccountNumber == account?.accountNumber;
                    final statusColor = _getStatusColor(tx.status);

                    return InkWell(
                      onTap: () => TransactionDetailSheet.show(context, tx, account),
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isDebit ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                isDebit ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                                color: isDebit ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isDebit ? 'To: ${tx.receiverAccountNumber}' : 'From: ${tx.senderAccountNumber}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    tx.description.isNotEmpty ? tx.description : 'Fund Transfer',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${isDebit ? '-' : '+'}₹${tx.amount}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isDebit ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  tx.status,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: statusColor,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
          ],
        ),
      ),
    );
  }
}
