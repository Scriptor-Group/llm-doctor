# Publishing Guide

## Pre-publish Checklist

- [ ] Update version in `package.json`
- [ ] Run `npm run build` successfully
- [ ] Test CLI: `node bin/llm-doctor.js --help`
- [ ] Check package contents: `npm pack --dry-run`
- [ ] Verify package size is reasonable (< 5MB)
- [ ] Update README if needed
- [ ] Commit all changes

## Build & Test

```bash
# Clean build
rm -rf dist
npm run build

# Test locally
npm pack
npm install -g llm-doctor-2.1.0.tgz
llm-doctor --help
```

## Publish to npm

```bash
# Dry run
npm publish --dry-run

# Publish (requires npm login)
npm publish

# Or publish with public access
npm publish --access public
```

## Post-publish

- Tag the release in git
- Create GitHub release
- Update documentation

## Testing with npx

After publishing:

```bash
# Should work immediately
npx llm-doctor@latest

# Or specific version
npx llm-doctor@2.1.0
```

## Package Structure

Files included in npm package (defined in `package.json` > `files`):
- `dist/` - Compiled JavaScript
- `bin/` - CLI entry point
- `assets/demo.mp4` - Demo video (optimized)
- `README.md` - Documentation
- `LICENSE` - CC-BY-NC-SA-4.0

Files excluded:
- `src/` - TypeScript source (for development only)
- `node_modules/` - Dependencies
- Development files (CHANGELOG, etc.)
