import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/account_provider.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

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
    final accountProvider = context.watch<AccountProvider>();
    final account = accountProvider.primaryAccount;
    final transactions = accountProvider.recentTransactions;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Transaction History', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await accountProvider.fetchAccountData();
        },
        child: transactions.isEmpty
            ? const Center(
                child: Text('No transaction history found.', style: TextStyle(color: Color(0xFF64748B))),
              )
            : ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                itemCount: transactions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final tx = transactions[index];
                  final isDebit = tx.senderAccountNumber == account?.accountNumber;

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Row(
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
                                    color: _getStatusColor(tx.status),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Divider(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              tx.correlationId != null
                                  ? 'Corr: ${tx.correlationId!.substring(0, 8)}...'
                                  : 'ID: ${tx.id.substring(0, 8)}...',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontFamily: 'monospace'),
                            ),
                            Text(
                              'Strategy: ${tx.concurrencyStrategy}',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}
