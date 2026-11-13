import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Configurable at compile-time via --dart-define=API_BASE_URL=https://datacore-backend-wktd.onrender.com
  // Defaults to production Render backend URL
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://datacore-backend-wktd.onrender.com',
  );
  final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  ApiService({String? baseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? defaultBaseUrl,
            connectTimeout: const Duration(seconds: 45),
            receiveTimeout: const Duration(seconds: 45),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
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
            // Attempt refresh or clean storage
            await storage.deleteAll();
          }
          return handler.next(e);
        },
      ),
    );
  }
}
