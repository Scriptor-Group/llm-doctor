# Package Testing Guide

## ✅ Build & Package Validation

### 1. Clean Build
```bash
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

### 2. Verify Build Output
```bash
# Should show compiled files
ls -lh dist/
ls -lh dist/server.js

# Should show 28 JS files
find dist -name "*.js" | wc -l
```

### 3. Check Package Size
```bash
npm pack --dry-run | grep "package size"
# Expected: ~315 KB (not 69 MB!)
```

### 4. Create Package
```bash
npm pack
# Creates: llm-doctor-2.1.0.tgz
```

### 5. Verify Package Contents
```bash
tar -tzf llm-doctor-2.1.0.tgz | grep -E "(bin/|demo\.mp4|server\.js)"
# Should show:
# - package/bin/llm-doctor.js
# - package/dist/server.js
# - package/assets/demo.mp4
```

## ✅ CLI Testing

### Test 1: Help Command
```bash
node bin/llm-doctor.js --help
# Should display help message
```

### Test 2: Local Install
```bash
# In a test directory
cd /tmp
npm install /path/to/llm-doctor-2.1.0.tgz

# Test CLI
npx llm-doctor --help
# Should work without errors
```

### Test 3: Global Install (optional)
```bash
npm install -g llm-doctor-2.1.0.tgz

# Should be available globally
llm-doctor --help
llm-doctor --port 3000 &
sleep 2
curl http://localhost:3000/health
kill %1
```

## ✅ Functional Testing

### Test 4: Start Server
```bash
llm-doctor --port 9999 &
DOCTOR_PID=$!

# Wait for startup
sleep 3

# Test endpoints
curl http://localhost:9999/health
curl http://localhost:9999/v1/models

# Stop server
kill $DOCTOR_PID
```

### Test 5: With API Key
```bash
llm-doctor --api-key sk-test-123 --port 9998 &
# Should start and accept the API key
kill %1
```

## ✅ Dependencies Check

### Test 6: Required Dependencies
```bash
# Extract and check dependencies
tar -xzf llm-doctor-2.1.0.tgz
cd package

# Should have these in package.json
grep -A 5 "dependencies" package.json
# Expected:
# - express
# - blessed
# - dotenv

cd ..
rm -rf package
```

## 🎯 Pre-Publish Checklist

- [ ] `npm run build` succeeds without errors
- [ ] Package size < 500 KB
- [ ] `npm pack --dry-run` shows correct files
- [ ] `node bin/llm-doctor.js --help` works
- [ ] Local install and npx work
- [ ] Server starts on custom port
- [ ] Video demo.mp4 is included (264 KB)
- [ ] dist/ directory is included
- [ ] src/ directory is NOT included

## 🚀 Ready to Publish!

If all tests pass:

```bash
# Publish to npm (requires login)
npm login
npm publish --access public

# Or test locally first
npm link
llm-doctor --help
```

## 📦 Post-Publish Test

```bash
# Test from npm registry
npx llm-doctor@latest --help

# Should download and run without needing local files
```

## ⚠️ Common Issues

### Issue: "Cannot find module dist/server.js"
**Solution:** Run `npm run build` before testing

### Issue: Package size > 50 MB
**Solution:** Check that demo-original.mp4 was removed, only demo.mp4 (264 KB) should exist

### Issue: "tsx: command not found"
**Solution:** The built version should use node, not tsx. Check bin/llm-doctor.js logic

### Issue: Module imports fail
**Solution:** Verify "type": "module" in package.json and all imports use .js extensions

## 📊 Success Criteria

✅ Build completes in < 10 seconds
✅ Package size < 500 KB
✅ Install time < 5 seconds
✅ CLI starts in < 2 seconds
✅ All endpoints respond
✅ UI renders correctly
✅ Error simulation menu works
✅ API key dialog works
