class LedgerEntryModel {
  final String id;
  final String? transactionId;
  final String accountNumber;
  final String entryType;
  final String amount;
  final String balanceAfter;
  final String description;
  final String createdAt;

  const LedgerEntryModel({
    required this.id,
    this.transactionId,
    required this.accountNumber,
    required this.entryType,
    required this.amount,
    required this.balanceAfter,
    required this.description,
    required this.createdAt,
  });

  factory LedgerEntryModel.fromJson(Map<String, dynamic> json) {
    return LedgerEntryModel(
      id: json['id'] ?? '',
      transactionId: json['transaction_id'],
      accountNumber: json['account_number'] ?? '',
      entryType: json['entry_type'] ?? 'DEBIT',
      amount: json['amount'] ?? '0.00',
      balanceAfter: json['balance_after'] ?? '0.00',
      description: json['description'] ?? '',
      createdAt: json['created_at'] ?? '',
    );
  }

  bool get isCredit => entryType == 'CREDIT';
}

class StatementModel {
  final String accountNumber;
  final String userEmail;
  final String currency;
  final String openingBalance;
  final String totalCredits;
  final String totalDebits;
  final String currentBalance;
  final int ledgerEntriesCount;
  final List<LedgerEntryModel> statementEntries;

  const StatementModel({
    required this.accountNumber,
    required this.userEmail,
    required this.currency,
    required this.openingBalance,
    required this.totalCredits,
    required this.totalDebits,
    required this.currentBalance,
    required this.ledgerEntriesCount,
    required this.statementEntries,
  });

  factory StatementModel.fromJson(Map<String, dynamic> json) {
    final rawEntries = json['statement_entries'] as List? ?? [];
    return StatementModel(
      accountNumber: json['account_number'] ?? '',
      userEmail: json['user_email'] ?? '',
      currency: json['currency'] ?? 'INR',
      openingBalance: json['opening_balance'] ?? '0.00',
      totalCredits: json['total_credits'] ?? '0.00',
      totalDebits: json['total_debits'] ?? '0.00',
      currentBalance: json['current_balance'] ?? '0.00',
      ledgerEntriesCount: json['ledger_entries_count'] ?? rawEntries.length,
      statementEntries: rawEntries.map((e) => LedgerEntryModel.fromJson(e)).toList(),
    );
  }
}
