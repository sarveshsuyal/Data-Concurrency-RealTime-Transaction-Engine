import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/account_provider.dart';
import '../providers/notification_provider.dart';
import '../models/beneficiary_model.dart';

class TransferScreen extends StatefulWidget {
  const TransferScreen({super.key});

  @override
  State<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends State<TransferScreen> {
  final _recipientController = TextEditingController(text: 'bob@datacore.io');
  final _amountController = TextEditingController(text: '250.00');
  final _descController = TextEditingController(text: 'Lunch split');
  String _selectedStrategy = 'PESSIMISTIC';

  @override
  void dispose() {
    _recipientController.dispose();
    _amountController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _selectBeneficiary(BeneficiaryModel beneficiary) {
    setState(() {
      _recipientController.text = beneficiary.identifier;
      if (beneficiary.note.isNotEmpty) {
        _descController.text = beneficiary.note;
      }
    });
  }

  void _addQuickAmount(double delta, double maxBalance) {
    final current = double.tryParse(_amountController.text) ?? 0.0;
    final updated = (current + delta).clamp(0.0, maxBalance);
    setState(() {
      _amountController.text = updated.toStringAsFixed(2);
    });
  }

  void _showAddPayeeDialog(BuildContext context) {
    final nameController = TextEditingController();
    final idController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Add Frequent Payee', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'Contact Name',
                hintText: 'e.g. Sarah Jenkins',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: idController,
              decoration: InputDecoration(
                labelText: 'Account No. or Email',
                hintText: 'e.g. sarah@datacore.io',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isNotEmpty && idController.text.trim().isNotEmpty) {
                context.read<AccountProvider>().addBeneficiary(
                  nameController.text.trim(),
                  idController.text.trim(),
                );
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Contact added to Quick Payees!')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF436CF0)),
            child: const Text('Add Contact', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmAndSend() {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid positive amount.')),
      );
      return;
    }

    final accountProvider = context.read<AccountProvider>();
    final currentBal = double.tryParse(accountProvider.primaryAccount?.balance ?? '0') ?? 0.0;
    if (amount > currentBal) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Insufficient balance for this transaction.')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Confirm Fund Transfer',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Recipient', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      Text(_recipientController.text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Amount', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      Text('₹${amount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF436CF0))),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Concurrency Lock', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      Text(_selectedStrategy, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A))),
                    ],
                  ),
                  const Divider(height: 20),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Transfer Fee', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                      Text('₹0.00 (Zero-Fee)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF10B981))),
                    ],
                  ),
                  if (_descController.text.isNotEmpty) ...[
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Note', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                        Text(_descController.text, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () async {
                  Navigator.pop(context);
                  final success = await context.read<AccountProvider>().executeTransfer(
                    receiverIdentifier: _recipientController.text,
                    amount: amount,
                    description: _descController.text,
                    strategy: _selectedStrategy,
                  );
                  if (!mounted) return;
                  if (success) {
                    context.read<NotificationProvider>().addLocalNotification(
                      title: 'Transfer Sent',
                      message: 'Transferred ₹${amount.toStringAsFixed(2)} to ${_recipientController.text}.',
                      category: 'TRANSFER',
                    );

                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        title: const Row(
                          children: [
                            Icon(Icons.check_circle, color: Color(0xFF10B981)),
                            SizedBox(width: 8),
                            Text('Transfer Successful!'),
                          ],
                        ),
                        content: Text('Successfully transferred ₹${amount.toStringAsFixed(2)} with authoritative double-entry confirmation.'),
                        actions: [
                          TextButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              context.go('/history');
                            },
                            child: const Text('View History'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              context.go('/home');
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF436CF0),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Back to Home', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF436CF0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Authorize & Send', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final accountProvider = context.watch<AccountProvider>();
    final primaryAccount = accountProvider.primaryAccount;
    final currentBal = double.tryParse(primaryAccount?.balance ?? '0.00') ?? 0.0;
    final beneficiaries = accountProvider.beneficiaries;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Transfer Funds', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (accountProvider.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          accountProvider.errorMessage!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Beneficiaries / Quick Contacts
              const Text('QUICK CONTACTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 10),
              SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: beneficiaries.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return GestureDetector(
                        onTap: () => _showAddPayeeDialog(context),
                        child: const Column(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: Color(0xFFF1F5F9),
                              child: Icon(Icons.add, color: Color(0xFF436CF0), size: 20),
                            ),
                            SizedBox(height: 4),
                            Text('Add', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF436CF0))),
                          ],
                        ),
                      );
                    }
                    final b = beneficiaries[index - 1];
                    final isSelected = _recipientController.text == b.identifier;

                    return GestureDetector(
                      onTap: () => _selectBeneficiary(b),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: isSelected ? const Color(0xFF436CF0) : const Color(0xFFE2E8F0),
                            child: Text(
                              b.initials,
                              style: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF334155),
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            b.name.split(' ').first,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              color: isSelected ? const Color(0xFF436CF0) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Recipient Input
              const Text('RECIPIENT (ACCOUNT NO. OR EMAIL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              TextField(
                controller: _recipientController,
                decoration: InputDecoration(
                  hintText: 'e.g. bob@datacore.io or DC-1234-5678',
                  prefixIcon: const Icon(Icons.person_outline, size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                ),
              ),
              const SizedBox(height: 20),

              // Amount Input
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('AMOUNT (₹)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5)),
                  Text(
                    'Available: ₹${primaryAccount?.balance ?? '0.00'}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF436CF0)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                decoration: InputDecoration(
                  prefixText: '₹ ',
                  prefixStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF436CF0)),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                ),
              ),
              const SizedBox(height: 10),

              // Quick Amount Chips
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _buildAmountChip('+₹100', () => _addQuickAmount(100, currentBal)),
                  _buildAmountChip('+₹500', () => _addQuickAmount(500, currentBal)),
                  _buildAmountChip('+₹1,000', () => _addQuickAmount(1000, currentBal)),
                  _buildAmountChip('+₹5,000', () => _addQuickAmount(5000, currentBal)),
                  _buildAmountChip('Max Balance', () {
                    setState(() => _amountController.text = currentBal.toStringAsFixed(2));
                  }),
                ],
              ),

              const SizedBox(height: 20),

              // Concurrency Strategy Selector
              const Text('CONCURRENCY STRATEGY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildStrategyPill('PESSIMISTIC', 'Pessimistic', 'Row Lock'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStrategyPill('OPTIMISTIC', 'Optimistic', 'Version Check'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildStrategyPill('ATOMIC_CONDITIONAL', 'Atomic', 'Conditional'),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Description
              const Text('NOTE / DESCRIPTION (OPTIONAL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5)),
              const SizedBox(height: 8),
              TextField(
                controller: _descController,
                decoration: InputDecoration(
                  hintText: 'What is this for?',
                  prefixIcon: const Icon(Icons.chat_bubble_outline, size: 20),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                ),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: accountProvider.isLoading ? null : _confirmAndSend,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF436CF0),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: accountProvider.isLoading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Review & Transfer', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAmountChip(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFCBD5E1)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
        ),
      ),
    );
  }

  Widget _buildStrategyPill(String strategyKey, String title, String subtitle) {
    final isSelected = _selectedStrategy == strategyKey;
    return GestureDetector(
      onTap: () => setState(() => _selectedStrategy = strategyKey),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF436CF0) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF436CF0) : const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 9,
                color: isSelected ? Colors.white70 : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
