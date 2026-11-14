import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Production Render Backend URL
  static const String defaultBaseUrl = 'https://datacore-backend-wktd.onrender.com';
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

  Future<Response> createIncident({
    required String title,
    required String description,
    String severity = 'MEDIUM',
    String status = 'DETECTED',
    String affectedService = 'Customer Mobile App',
  }) async {
    return await dio.post(
      '/api/admin/incidents/',
      data: {
        'title': title,
        'description': description,
        'severity': severity,
        'status': status,
        'affected_service': affectedService,
      },
    );
  }
}
