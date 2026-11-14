import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../models/account_model.dart';
import '../models/transaction_model.dart';
import '../services/api_service.dart';

class AccountProvider with ChangeNotifier {
  final ApiService _apiService;
  AccountModel? _primaryAccount;
  List<TransactionModel> _recentTransactions = [];
  TransactionModel? _lastExecutedTransaction;
  bool _isLoading = false;
  String? _errorMessage;
  double _upiLiteBalance = 0.0;

  AccountProvider(this._apiService);

  AccountModel? get primaryAccount => _primaryAccount;
  List<TransactionModel> get recentTransactions => _recentTransactions;
  TransactionModel? get lastExecutedTransaction => _lastExecutedTransaction;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  double get upiLiteBalance => _upiLiteBalance;

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

  Future<void> fetchTransactions() async {
    try {
      final response = await _apiService.dio.get('/api/transactions/');
      final List list = response.data is List ? response.data : response.data['results'] ?? [];
      _recentTransactions = list.map((json) => TransactionModel.fromJson(json)).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> executeTransfer({
    required String receiverIdentifier,
    required double amount,
    String description = '',
    String concurrencyStrategy = 'PESSIMISTIC',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // Generate unique UUID v4 idempotency key for client-side duplicate protection
    final String idempotencyKey = const Uuid().v4();

    try {
      final response = await _apiService.dio.post(
        '/api/transactions/',
        data: {
          'receiver_identifier': receiverIdentifier.trim(),
          'amount': amount.toStringAsFixed(2),
          'description': description.trim(),
          'concurrency_strategy': concurrencyStrategy,
        },
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );

      final Map<String, dynamic> data = response.data is Map<String, dynamic>
          ? response.data
          : {'id': idempotencyKey, 'amount': amount.toStringAsFixed(2)};

      _lastExecutedTransaction = TransactionModel.fromJson(data);

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

  void topUpUpiLite(double amount) {
    if (_primaryAccount != null) {
      final currentBal = double.tryParse(_primaryAccount!.balance) ?? 0.0;
      if (amount <= currentBal) {
        _upiLiteBalance += amount;
        notifyListeners();
      }
    }
  }

  bool executeUpiLiteTransfer({
    required String receiverIdentifier,
    required double amount,
  }) {
    if (amount <= _upiLiteBalance) {
      _upiLiteBalance -= amount;
      notifyListeners();
      return true;
    }
    return false;
  }
}
