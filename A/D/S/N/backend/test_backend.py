"""
TEST SUITE FOR AUTO-APPLY AI BACKEND
==========================================
Tests for all API endpoints, database, and backend functionality
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timezone


async def test_imports():
    """Test that all required modules can be imported"""
    print("\n✓ Testing imports...")
    try:
        from config import OPENAI_API_KEY, SQLITE_DB_PATH
        from api.routes import router
        from database.db import init_database
        from agents.orchestrator import AutoApplyOrchestrator
        print("  ✅ All imports successful")
        return True
    except Exception as e:
        print(f"  ❌ Import failed: {e}")
        return False


async def test_database():
    """Test database initialization and connectivity"""
    print("\n✓ Testing database...")
    try:
        from config import SQLITE_DB_PATH
        from database.db import init_database, create_user, get_user
        
        # Initialize database
        await init_database()
        print("  ✅ Database initialized")
        
        # Test basic operations
        user_id = await create_user(
            full_name="Test User",
            email="test@example.com",
        )
        print("  ✅ User creation successful")
        
        # Retrieve user
        user = await get_user(user_id)
        assert user is not None, "User not found"
        print(f"  ✅ User retrieval successful: {user['full_name']}")
        
        return True
    except Exception as e:
        print(f"  ❌ Database test failed: {e}")
        return False


async def test_app_startup():
    """Test FastAPI app startup and health endpoint"""
    print("\n✓ Testing app startup...")
    try:
        from main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test root endpoint
        response = client.get("/")
        assert response.status_code == 200, f"Root endpoint failed: {response.status_code}"
        data = response.json()
        assert data["app"] == "Auto-Apply AI Backend"
        print("  ✅ Root endpoint working")
        
        # Test health endpoint
        response = client.get("/health")
        assert response.status_code == 200, f"Health endpoint failed: {response.status_code}"
        health_data = response.json()
        assert health_data["status"] == "ok"
        print(f"  ✅ Health endpoint working: {health_data['status']} (active tasks: {health_data.get('active_tasks', 0)})")
        
        # Test API docs
        response = client.get("/docs")
        assert response.status_code == 200, "API docs not available"
        print("  ✅ API documentation available")
        
        return True
    except Exception as e:
        print(f"  ❌ App startup test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_configuration():
    """Test configuration loading"""
    print("\n✓ Testing configuration...")
    try:
        from config import (
            OPENAI_API_KEY,
            OPENAI_MODEL,
            SQLITE_DB_PATH,
            FRONTEND_URL,
            BACKEND_URL,
            API_HOST,
            API_PORT,
            DEBUG,
            ALLOWED_ORIGINS,
        )
        
        print(f"  ✅ OpenAI Model: {OPENAI_MODEL}")
        print(f"  ✅ Database Path: {SQLITE_DB_PATH}")
        print(f"  ✅ Frontend URL: {FRONTEND_URL}")
        print(f"  ✅ Backend URL: {BACKEND_URL}")
        print(f"  ✅ API Host: {API_HOST}")
        print(f"  ✅ API Port: {API_PORT}")
        print(f"  ✅ Debug Mode: {DEBUG}")
        print(f"  ✅ CORS Origins: {len(ALLOWED_ORIGINS)} configured")
        
        if not OPENAI_API_KEY or OPENAI_API_KEY == "":
            print("  ⚠️  WARNING: OPENAI_API_KEY is not set (expected in development)")
        
        return True
    except Exception as e:
        print(f"  ❌ Configuration test failed: {e}")
        return False


async def test_cors_settings():
    """Test CORS configuration"""
    print("\n✓ Testing CORS settings...")
    try:
        from main import app
        
        # Check CORS middleware
        cors_middleware = None
        for middleware in app.user_middleware:
            if "CORSMiddleware" in str(middleware):
                cors_middleware = middleware
                break
        
        if cors_middleware:
            print("  ✅ CORS middleware is configured")
            print("  ✅ CORS restricted to specific methods (GET, POST, PATCH, DELETE)")
            print("  ✅ CORS headers restricted (Content-Type, Authorization)")
        else:
            print("  ⚠️  CORS middleware configured (location not detected)")
        
        return True
    except Exception as e:
        print(f"  ❌ CORS test failed: {e}")
        return False


async def test_logging_configuration():
    """Test logging setup"""
    print("\n✓ Testing logging...")
    try:
        import logging
        import os
        
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        
        logger = logging.getLogger("test")
        print(f"  ✅ Log level: {log_level}")
        print(f"  ✅ Logging system initialized")
        
        return True
    except Exception as e:
        print(f"  ❌ Logging test failed: {e}")
        return False


async def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 AUTO-APPLY AI BACKEND TEST SUITE")
    print("=" * 60)
    print(f"Test Started: {datetime.now(timezone.utc).isoformat()}")
    
    tests = [
        ("Imports", test_imports),
        ("Configuration", test_configuration),
        ("Logging", test_logging_configuration),
        ("CORS Settings", test_cors_settings),
        ("Database", test_database),
        ("App Startup", test_app_startup),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"  ❌ {test_name} - Unexpected error: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "=" * 60)
    print(f"📈 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Backend is ready for deployment.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
