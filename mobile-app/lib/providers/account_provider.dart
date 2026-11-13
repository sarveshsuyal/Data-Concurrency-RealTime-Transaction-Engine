import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../models/statement_model.dart';
import '../models/beneficiary_model.dart';
import '../services/api_service.dart';

class AccountProvider with ChangeNotifier {
  final ApiService _apiService;
  AccountModel? _primaryAccount;
  List<TransactionModel> _recentTransactions = [];
  StatementModel? _statement;
  bool _isLoading = false;
  bool _isStatementLoading = false;
  String? _errorMessage;

  // UX & Security States
  bool _isBalanceVisible = true;
  bool _isAccountLocked = false;
  double _dailyLimit = 50000.0;
  String _selectedStrategy = 'PESSIMISTIC';

  // Saved Beneficiaries for Instant Transfers
  final List<BeneficiaryModel> _beneficiaries = [
    const BeneficiaryModel(id: 'b1', name: 'Bob Smith', identifier: 'bob@datacore.io', note: 'Co-worker'),
    const BeneficiaryModel(id: 'b2', name: 'Charlie Dave', identifier: 'charlie@datacore.io', note: 'Dev Lead'),
    const BeneficiaryModel(id: 'b3', name: 'Cloud Provider', identifier: 'cloud-settlement@datacore.io', note: 'Infrastructure'),
    const BeneficiaryModel(id: 'b4', name: 'Alice Walker', identifier: 'alice@datacore.io', note: 'Personal Test'),
  ];

  AccountProvider(this._apiService);

  AccountModel? get primaryAccount => _primaryAccount;
  List<TransactionModel> get recentTransactions => _recentTransactions;
  StatementModel? get statement => _statement;
  bool get isLoading => _isLoading;
  bool get isStatementLoading => _isStatementLoading;
  String? get errorMessage => _errorMessage;

  bool get isBalanceVisible => _isBalanceVisible;
  bool get isAccountLocked => _isAccountLocked;
  double get dailyLimit => _dailyLimit;
  String get selectedStrategy => _selectedStrategy;
  List<BeneficiaryModel> get beneficiaries => _beneficiaries;

  void toggleBalanceVisibility() {
    _isBalanceVisible = !_isBalanceVisible;
    notifyListeners();
  }

  void toggleAccountLock() {
    _isAccountLocked = !_isAccountLocked;
    notifyListeners();
  }

  void setDailyLimit(double limit) {
    _dailyLimit = limit;
    notifyListeners();
  }

  void setConcurrencyStrategy(String strategy) {
    _selectedStrategy = strategy;
    notifyListeners();
  }

  void addBeneficiary(String name, String identifier, [String note = '']) {
    _beneficiaries.insert(0, BeneficiaryModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name.trim(),
      identifier: identifier.trim(),
      note: note.trim(),
    ));
    notifyListeners();
  }

  Future<void> fetchAccounts() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/api/accounts/');
      final List list = response.data is List ? response.data : response.data['results'] ?? [];
      if (list.isNotEmpty) {
        _primaryAccount = AccountModel.fromJson(list.first);
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to load account details.';
      notifyListeners();
    }
  }

  Future<void> fetchAccountData() async {
    await Future.wait([
      fetchAccounts(),
      fetchTransactions(),
    ]);
  }

  Future<void> fetchTransactions() async {
    try {
      final response = await _apiService.dio.get('/api/transactions/');
      final List list = response.data is List ? response.data : response.data['results'] ?? [];
      _recentTransactions = list.map((json) => TransactionModel.fromJson(json)).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> fetchStatement() async {
    if (_primaryAccount == null) return;
    _isStatementLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.dio.get('/api/accounts/${_primaryAccount!.id}/statement/');
      _statement = StatementModel.fromJson(response.data);
    } catch (e) {
      // Create local fallback statement from recent transactions if endpoint is unreachable
      if (_primaryAccount != null) {
        double credits = 0;
        double debits = 0;
        for (final tx in _recentTransactions) {
          final amt = double.tryParse(tx.amount) ?? 0.0;
          if (tx.receiverAccountNumber == _primaryAccount!.accountNumber) {
            credits += amt;
          } else {
            debits += amt;
          }
        }
        _statement = StatementModel(
          accountNumber: _primaryAccount!.accountNumber,
          userEmail: _primaryAccount!.userEmail,
          currency: _primaryAccount!.currency,
          openingBalance: '0.00',
          totalCredits: credits.toStringAsFixed(2),
          totalDebits: debits.toStringAsFixed(2),
          currentBalance: _primaryAccount!.balance,
          ledgerEntriesCount: _recentTransactions.length,
          statementEntries: _recentTransactions.map((tx) {
            final isCredit = tx.receiverAccountNumber == _primaryAccount!.accountNumber;
            return LedgerEntryModel(
              id: tx.id,
              transactionId: tx.id,
              accountNumber: _primaryAccount!.accountNumber,
              entryType: isCredit ? 'CREDIT' : 'DEBIT',
              amount: tx.amount,
              balanceAfter: _primaryAccount!.balance,
              description: tx.description.isNotEmpty ? tx.description : 'Fund Transfer',
              createdAt: tx.createdAt,
            );
          }).toList(),
        );
      }
    } finally {
      _isStatementLoading = false;
      notifyListeners();
    }
  }

  Future<bool> executeTransfer({
    required String receiverIdentifier,
    required double amount,
    String description = '',
    String? strategy,
  }) async {
    if (_isAccountLocked) {
      _errorMessage = 'Account transfers are currently locked by security controls.';
      notifyListeners();
      return false;
    }

    if (amount <= 0) {
      _errorMessage = 'Transfer amount must be strictly positive.';
      notifyListeners();
      return false;
    }

    if (receiverIdentifier.trim() == _primaryAccount?.accountNumber ||
        receiverIdentifier.trim() == _primaryAccount?.userEmail) {
      _errorMessage = 'Cannot transfer funds to your own account.';
      notifyListeners();
      return false;
    }

    if (amount > _dailyLimit) {
      _errorMessage = 'Amount exceeds the daily transfer limit of ₹${_dailyLimit.toStringAsFixed(0)}.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // Generate unique UUID v4 idempotency key for client-side duplicate protection
    final String idempotencyKey = const Uuid().v4();
    final chosenStrategy = strategy ?? _selectedStrategy;

    try {
      await _apiService.dio.post(
        '/api/transactions/',
        data: {
          'receiver_identifier': receiverIdentifier.trim(),
          'amount': amount.toStringAsFixed(2),
          'description': description.trim(),
          'concurrency_strategy': chosenStrategy,
        },
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );

      // Refresh accounts & transactions after successful transfer
      await fetchAccounts();
      await fetchTransactions();

      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _isLoading = false;
      _errorMessage = e.response?.data['detail'] ??
          e.response?.data['non_field_errors']?[0] ??
          'Transfer failed. Check balance or recipient.';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Unexpected transfer error.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> reverseTransaction(String transactionId, {String reason = 'Customer Reversal Request'}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.dio.post(
        '/api/transactions/$transactionId/reverse/',
        data: {'reason': reason},
      );

      await fetchAccounts();
      await fetchTransactions();

      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _isLoading = false;
      _errorMessage = e.response?.data['detail'] ?? 'Transaction reversal could not be completed.';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to execute reversal.';
      notifyListeners();
      return false;
    }
  }
}
