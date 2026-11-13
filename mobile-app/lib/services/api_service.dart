import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Default base URL: 127.0.0.1 for local/Termux/Web, 10.0.2.2 for Android Emulator
  static const String defaultBaseUrl = kIsWeb ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000';
  final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  ApiService({String? baseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? defaultBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 10),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _initInterceptors();
    _loadCustomBaseUrl();
  }

  void _initInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Attempt refresh or clean storage on auth expiration
            await storage.deleteAll();
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<void> _loadCustomBaseUrl() async {
    try {
      final savedUrl = await storage.read(key: 'api_base_url');
      if (savedUrl != null && savedUrl.isNotEmpty) {
        dio.options.baseUrl = savedUrl;
      }
    } catch (_) {}
  }

  Future<void> setBaseUrl(String newUrl) async {
    final sanitized = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    dio.options.baseUrl = sanitized;
    await storage.write(key: 'api_base_url', value: sanitized);
  }

  String get currentBaseUrl => dio.options.baseUrl;

  Future<bool> checkHealth() async {
    try {
      final res = await dio.get('/health/');
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
