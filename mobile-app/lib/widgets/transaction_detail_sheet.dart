import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../models/account_model.dart';
import '../providers/account_provider.dart';

class TransactionDetailSheet extends StatelessWidget {
  final TransactionModel transaction;
  final AccountModel? primaryAccount;

  const TransactionDetailSheet({
    super.key,
    required this.transaction,
    required this.primaryAccount,
  });

  static void show(BuildContext context, TransactionModel transaction, AccountModel? primaryAccount) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TransactionDetailSheet(
        transaction: transaction,
        primaryAccount: primaryAccount,
      ),
    );
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

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return Icons.check_circle_outline;
      case 'REVERSED':
        return Icons.replay_circle_filled;
      case 'FAILED':
        return Icons.cancel_outlined;
      case 'ROLLED_BACK':
        return Icons.history;
      default:
        return Icons.access_time;
    }
  }

  void _confirmReversal(BuildContext context) {
    final reasonController = TextEditingController(text: 'Customer requested reversal');
    showDialog(
      context: context,
      builder: (dlgContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Color(0xFF8B5CF6)),
            SizedBox(width: 8),
            Text('Request Reversal', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This initiates an immutable compensatory ledger transaction reversing the funds back to your account.',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                labelText: 'Reason for Reversal',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dlgContext),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dlgContext); // close dialog
              Navigator.pop(context); // close sheet
              final success = await context.read<AccountProvider>().reverseTransaction(
                    transaction.id,
                    reason: reasonController.text,
                  );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Reversal successfully recorded.' : 'Reversal could not be executed.'),
                    backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Confirm Reversal', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDebit = transaction.senderAccountNumber == primaryAccount?.accountNumber;
    final statusColor = _getStatusColor(transaction.status);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top drag pill
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header: Status badge & Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_getStatusIcon(transaction.status), size: 14, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          transaction.status,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${isDebit ? '-' : '+'}₹${transaction.amount}',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: isDebit ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              Text(
                transaction.description.isNotEmpty ? transaction.description : 'Fund Transfer',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 20),

              // Itemized Details Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildRow(
                      'Sender',
                      transaction.senderAccountNumber,
                      copyableText: transaction.senderAccountNumber,
                      context: context,
                    ),
                    const Divider(height: 18),
                    _buildRow(
                      'Recipient',
                      transaction.receiverAccountNumber,
                      copyableText: transaction.receiverAccountNumber,
                      context: context,
                    ),
                    const Divider(height: 18),
                    _buildRow(
                      'Date & Time',
                      transaction.createdAt.length >= 19
                          ? transaction.createdAt.substring(0, 19).replaceAll('T', ' ')
                          : transaction.createdAt,
                      context: context,
                    ),
                    const Divider(height: 18),
                    _buildRow(
                      'Strategy',
                      transaction.concurrencyStrategy,
                      subtitle: 'Concurrency Lock Pattern',
                      context: context,
                    ),
                    if (transaction.latencyMs > 0) ...[
                      const Divider(height: 18),
                      _buildRow(
                        'Engine Latency',
                        '${transaction.latencyMs.toStringAsFixed(1)} ms',
                        context: context,
                      ),
                    ],
                    const Divider(height: 18),
                    _buildRow(
                      'Transaction ID',
                      transaction.id.length > 12 ? '${transaction.id.substring(0, 12)}...' : transaction.id,
                      copyableText: transaction.id,
                      isMonospace: true,
                      context: context,
                    ),
                    if (transaction.correlationId != null) ...[
                      const Divider(height: 18),
                      _buildRow(
                        'Correlation ID',
                        '${transaction.correlationId!.substring(0, 12)}...',
                        copyableText: transaction.correlationId,
                        isMonospace: true,
                        context: context,
                      ),
                    ],
                    if (transaction.idempotencyKey != null) ...[
                      const Divider(height: 18),
                      _buildRow(
                        'Idempotency Key',
                        '${transaction.idempotencyKey!.substring(0, 12)}...',
                        copyableText: transaction.idempotencyKey,
                        isMonospace: true,
                        context: context,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Ledger Invariant Guarantee Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified_outlined, size: 18, color: Color(0xFF16A34A)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Double-entry balanced • Immutable ledger invariant preserved.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF15803D), fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        final summary = 'DataCore Transfer Receipt\n'
                            'ID: ${transaction.id}\n'
                            'Amount: ₹${transaction.amount}\n'
                            'Status: ${transaction.status}\n'
                            'To: ${transaction.receiverAccountNumber}\n'
                            'Strategy: ${transaction.concurrencyStrategy}';
                        Clipboard.setData(ClipboardData(text: summary));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Receipt copied to clipboard!')),
                        );
                      },
                      icon: const Icon(Icons.copy, size: 16, color: Color(0xFF0F172A)),
                      label: const Text('Copy Receipt', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                    ),
                  ),
                  if (transaction.isCompleted && isDebit) ...[
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _confirmReversal(context),
                        icon: const Icon(Icons.replay, size: 16, color: Colors.white),
                        label: const Text('Reversal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5CF6),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(
    String label,
    String value, {
    String? subtitle,
    String? copyableText,
    bool isMonospace = false,
    required BuildContext context,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            if (subtitle != null)
              Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: const Color(0xFF0F172A),
                fontFamily: isMonospace ? 'monospace' : null,
              ),
            ),
            if (copyableText != null) ...[
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: copyableText));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$label copied!'), duration: const Duration(seconds: 1)),
                  );
                },
                child: const Icon(Icons.copy, size: 14, color: Color(0xFF64748B)),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
