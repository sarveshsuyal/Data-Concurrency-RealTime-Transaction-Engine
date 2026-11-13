import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/account_model.dart';

class ReceiveMoneySheet extends StatelessWidget {
  final AccountModel account;

  const ReceiveMoneySheet({super.key, required this.account});

  static void show(BuildContext context, AccountModel account) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ReceiveMoneySheet(account: account),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text(
              'Receive Funds',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'Scan QR or share your ledger account identifier',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 24),

            // Simulated Styled QR Code Box
            Container(
              width: 190,
              height: 190,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF436CF0).withOpacity(0.08),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF436CF0),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 12),
                  const Icon(Icons.qr_code_2, size: 90, color: Color(0xFF0F172A)),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Account Number Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ACCOUNT NUMBER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                      const SizedBox(height: 2),
                      Text(
                        account.accountNumber,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'monospace', color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18, color: Color(0xFF436CF0)),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: account.accountNumber));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Account number copied!')),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // User Email / Handle Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PAYMENT IDENTIFIER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                      const SizedBox(height: 2),
                      Text(
                        account.userEmail,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18, color: Color(0xFF436CF0)),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: account.userEmail));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Payment identifier copied!')),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () {
                  final details = 'DataCore Payment Request\n'
                      'Account: ${account.accountNumber}\n'
                      'Identifier: ${account.userEmail}\n'
                      'Currency: ${account.currency}';
                  Clipboard.setData(ClipboardData(text: details));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Complete account details copied to clipboard!')),
                  );
                },
                icon: const Icon(Icons.share_outlined, size: 18, color: Colors.white),
                label: const Text('Share Payment Details', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF436CF0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
