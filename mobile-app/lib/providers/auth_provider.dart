import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService;
  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider(this._apiService);

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  Future<bool> checkAuthStatus() async {
    final token = await _apiService.storage.read(key: 'access_token');
    if (token == null) return false;

    try {
      final response = await _apiService.dio.get('/api/auth/profile/');
      _user = UserModel.fromJson(response.data);
      notifyListeners();
      return true;
    } catch (_) {
      await _apiService.storage.deleteAll();
      _user = null;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post(
        '/api/auth/login/',
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      final data = response.data;
      await _apiService.storage.write(key: 'access_token', value: data['access']);
      await _apiService.storage.write(key: 'refresh_token', value: data['refresh']);
      _user = UserModel.fromJson(data['user']);
      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _isLoading = false;
      _errorMessage = e.response?.data['detail'] ??
          e.response?.data['non_field_errors']?[0] ??
          'Invalid credentials.';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'An unexpected error occurred.';
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.dio.post(
        '/api/auth/register/',
        data: {
          'full_name': fullName.trim(),
          'email': email.trim(),
          'password': password,
          'confirm_password': confirmPassword,
        },
      );

      final data = response.data;
      await _apiService.storage.write(key: 'access_token', value: data['access']);
      await _apiService.storage.write(key: 'refresh_token', value: data['refresh']);
      _user = UserModel.fromJson(data['user']);
      _isLoading = false;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      _isLoading = false;
      final errors = e.response?.data;
      if (errors is Map) {
        _errorMessage = errors.values.map((v) => v is List ? v.first : v.toString()).join('\n');
      } else {
        _errorMessage = 'Registration failed.';
      }
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to create account.';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _apiService.storage.read(key: 'refresh_token');
      if (refreshToken != null) {
        await _apiService.dio.post('/api/auth/logout/', data: {'refresh': refreshToken});
      }
    } catch (_) {}
    await _apiService.storage.deleteAll();
    _user = null;
    notifyListeners();
  }

  Future<void> sendHeartbeat() async {
    try {
      await _apiService.dio.post('/api/auth/heartbeat/');
    } catch (_) {}
  }
}
