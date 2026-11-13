import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/account_provider.dart';
import '../models/transaction_model.dart';
import '../widgets/transaction_detail_sheet.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _searchController = TextEditingController();
  String _activeFilter = 'ALL';
  String _sortBy = 'NEWEST';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
    final accountProvider = context.watch<AccountProvider>();
    final account = accountProvider.primaryAccount;
    final allTransactions = accountProvider.recentTransactions;

    // Filter transactions by search text and filter chip
    final query = _searchController.text.toLowerCase().trim();
    final filteredTransactions = allTransactions.where((tx) {
      final isDebit = tx.senderAccountNumber == account?.accountNumber;

      // Filter category check
      if (_activeFilter == 'DEBITS' && !isDebit) return false;
      if (_activeFilter == 'CREDITS' && isDebit) return false;
      if (_activeFilter == 'COMPLETED' && !tx.isCompleted) return false;
      if (_activeFilter == 'REVERSED' && !tx.isReversed) return false;

      // Search query check
      if (query.isNotEmpty) {
        final matchesRecipient = tx.receiverAccountNumber.toLowerCase().contains(query);
        final matchesSender = tx.senderAccountNumber.toLowerCase().contains(query);
        final matchesDesc = tx.description.toLowerCase().contains(query);
        final matchesId = tx.id.toLowerCase().contains(query);
        return matchesRecipient || matchesSender || matchesDesc || matchesId;
      }
      return true;
    }).toList();

    if (_sortBy == 'HIGHEST') {
      filteredTransactions.sort((a, b) => (double.tryParse(b.amount) ?? 0.0).compareTo(double.tryParse(a.amount) ?? 0.0));
    } else if (_sortBy == 'LOWEST') {
      filteredTransactions.sort((a, b) => (double.tryParse(a.amount) ?? 0.0).compareTo(double.tryParse(b.amount) ?? 0.0));
    } else if (_sortBy == 'OLDEST') {
      filteredTransactions.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    }

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
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort_rounded, color: Color(0xFF0F172A)),
            tooltip: 'Sort Transactions',
            onSelected: (val) => setState(() => _sortBy = val),
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'NEWEST', child: Text('Newest First')),
              const PopupMenuItem(value: 'OLDEST', child: Text('Oldest First')),
              const PopupMenuItem(value: 'HIGHEST', child: Text('Highest Amount')),
              const PopupMenuItem(value: 'LOWEST', child: Text('Lowest Amount')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await accountProvider.fetchAccountData();
        },
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'Search by account, recipient, or note...',
                  hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF64748B)),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                ),
              ),
            ),

            // Filter Chips
            Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildFilterChip('ALL', 'All (${allTransactions.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('DEBITS', 'Sent (-)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('CREDITS', 'Received (+)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('COMPLETED', 'Completed'),
                  const SizedBox(width: 8),
                  _buildFilterChip('REVERSED', 'Reversed'),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Transaction List View
            Expanded(
              child: filteredTransactions.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 48, color: const Color(0xFFCBD5E1)),
                          const SizedBox(height: 12),
                          const Text('No transactions match your criteria.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      itemCount: filteredTransactions.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final tx = filteredTransactions[index];
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
                                    Row(
                                      children: [
                                        Text(
                                          'Strategy: ${tx.concurrencyStrategy}',
                                          style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(Icons.chevron_right, size: 14, color: Color(0xFF94A3B8)),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF436CF0) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? const Color(0xFF436CF0) : const Color(0xFFE2E8F0)),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }
}
