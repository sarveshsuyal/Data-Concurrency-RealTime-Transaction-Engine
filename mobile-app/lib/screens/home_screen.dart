import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/account_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/balance_card.dart';
import '../widgets/quick_actions_grid.dart';
import '../widgets/receive_qr_sheet.dart';
import '../widgets/services_hub_view.dart';
import 'history_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentTabIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AccountProvider>().fetchAccounts();
      context.read<AccountProvider>().fetchTransactions();
      context.read<AuthProvider>().sendHeartbeat();
    });
  }

  void _openReceiveModal() {
    final auth = context.read<AuthProvider>();
    final account = context.read<AccountProvider>().primaryAccount;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReceiveQrSheet(
        userName: auth.user?.fullName ?? 'Customer',
        userEmail: auth.user?.email ?? 'customer@datacore.io',
        accountNumber: account?.accountNumber ?? 'DC-XXXX-XXXX',
      ),
    );
  }

  void _openScanModal() {
    final upiController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.qr_code_scanner_rounded, color: AppTheme.primary, size: 24),
                SizedBox(width: 8),
                Text(
                  'Scan Any UPI QR Code',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Scanner Viewport Mockup
            Container(
              width: 200,
              height: 160,
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.04),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary, width: 2),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.camera_alt_outlined, size: 36, color: AppTheme.primary),
                  SizedBox(height: 6),
                  Text('Align QR code inside frame', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('OR ENTER UPI ID MANUALLY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
            const SizedBox(height: 8),
            TextField(
              controller: upiController,
              decoration: InputDecoration(
                hintText: 'e.g. bob@datacore or merchant@upi',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward_rounded, color: AppTheme.primary),
                  onPressed: () {
                    if (upiController.text.trim().isNotEmpty) {
                      Navigator.pop(ctx);
                      context.go('/transfer?recipient=${Uri.encodeComponent(upiController.text.trim())}');
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeDashboard(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final accountProvider = context.watch<AccountProvider>();
    final account = accountProvider.primaryAccount;
    final transactions = accountProvider.recentTransactions;
    final userInitial = auth.user?.fullName.isNotEmpty == true ? auth.user!.fullName[0].toUpperCase() : 'U';

    return RefreshIndicator(
      onRefresh: () async {
        await accountProvider.fetchAccounts();
        await accountProvider.fetchTransactions();
        await auth.sendHeartbeat();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top User Bar
            Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _currentTabIndex = 3),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundColor: AppTheme.primary.withOpacity(0.12),
                    child: Text(
                      userInitial,
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        auth.user?.fullName ?? 'Customer',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textDark,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Text(
                        'DataCore High-Concurrency Wallet',
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_none_rounded, color: AppTheme.textDark),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('No unread notifications.')),
                    );
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 1. Authoritative Available Balance Gradient Card
            BalanceCard(
              account: account,
              isLoading: accountProvider.isLoading,
              errorMessage: accountProvider.errorMessage,
              onRefresh: () => accountProvider.fetchAccounts(),
            ),

            const SizedBox(height: 16),

            // 2. Quick Actions Grid (To Mobile, To Bank/UPI, Scan QR, Receive)
            QuickActionsGrid(
              onToMobile: () => context.go('/transfer'),
              onToBank: () => context.go('/transfer'),
              onScanQr: _openScanModal,
              onReceiveMoney: _openReceiveModal,
            ),

            const SizedBox(height: 22),

            // 4. Recharge & Pay Bills Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recharge & Pay Bills',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                ),
                TextButton(
                  onPressed: () => setState(() => _currentTabIndex = 1),
                  child: const Text('View All', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Services Quick Mini Grid
            Row(
              children: [
                _buildQuickServiceTile('⚡', 'Electricity', () => setState(() => _currentTabIndex = 1)),
                const SizedBox(width: 8),
                _buildQuickServiceTile('📱', 'Recharge', () => setState(() => _currentTabIndex = 1)),
                const SizedBox(width: 8),
                _buildQuickServiceTile('📺', 'DTH', () => setState(() => _currentTabIndex = 1)),
                const SizedBox(width: 8),
                _buildQuickServiceTile('🚗', 'FASTag', () => setState(() => _currentTabIndex = 1)),
              ],
            ),

            const SizedBox(height: 24),

            // 5. Recent Transactions Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Transactions',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                ),
                TextButton(
                  onPressed: () => setState(() => _currentTabIndex = 2),
                  child: const Text('History', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12)),
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
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Center(
                  child: Text('No transactions yet. Send your first transfer!', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: transactions.take(4).length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final tx = transactions[index];
                  final isDebit = tx.senderAccountNumber == account?.accountNumber;
                  final displayAmount = '${isDebit ? '-' : '+'}₹${tx.amount}';

                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isDebit ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            isDebit ? Icons.arrow_outward_rounded : Icons.arrow_downward_rounded,
                            color: isDebit ? AppTheme.error : AppTheme.success,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isDebit ? 'Paid to ${tx.receiverEmail.isNotEmpty ? tx.receiverEmail : tx.receiverAccountNumber}' : 'Received from ${tx.senderEmail.isNotEmpty ? tx.senderEmail : tx.senderAccountNumber}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textDark),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                tx.description.isNotEmpty ? tx.description : 'DataCore Transfer',
                                style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
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
                              displayAmount,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isDebit ? AppTheme.error : AppTheme.success,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tx.status,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: tx.status == 'COMPLETED' ? AppTheme.success : AppTheme.warning,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickServiceTile(String emoji, String title, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 20)),
              const SizedBox(height: 4),
              Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: IndexedStack(
          index: _currentTabIndex,
          children: [
            _buildHomeDashboard(context),
            ServicesHubView(onBackToHome: () => setState(() => _currentTabIndex = 0)),
            const HistoryScreen(isEmbedded: true),
            const ProfileScreen(isEmbedded: true),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentTabIndex,
          onTap: (index) => setState(() => _currentTabIndex = index),
          backgroundColor: Colors.white,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textMuted,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.grid_view_rounded), label: 'Services'),
            BottomNavigationBarItem(icon: Icon(Icons.history_rounded), label: 'History'),
            BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}
