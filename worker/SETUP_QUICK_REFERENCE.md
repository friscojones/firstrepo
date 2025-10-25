# Quick Setup Reference

## 🚀 One-Command Setup
```bash
cd worker && npm install && npm run setup
```

## 📋 Manual Steps Checklist

- [ ] Install dependencies: `npm install`
- [ ] Run setup script: `npm run setup`
- [ ] Update `wrangler.toml` with provided IDs
- [ ] Validate configuration: `npm run validate`
- [ ] Test locally: `npm run dev`
- [ ] Deploy: `npm run deploy`

## 🔧 Configuration Updates Needed

After running setup, update these in `wrangler.toml`:

```toml
# Replace these placeholders:
database_id = "your_actual_database_id"
id = "your_kv_namespace_id"
preview_id = "your_preview_namespace_id"
ALLOWED_ORIGINS = "https://yourusername.github.io"
```

## 🧪 Testing Commands

```bash
# Validate setup
npm run validate

# Test locally
npm run dev

# Check KV contents
npm run kv:list

# Query database
npm run db:query "SELECT COUNT(*) FROM players;"
```

## 📊 Sample Data Included

- **40+ educational sentences** for 5th graders
- **10 sample players** with scores for testing
- **Optimized database indexes** for performance
- **CORS configuration** for GitHub Pages

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database not found" | Update `database_id` in wrangler.toml |
| "KV namespace not found" | Update KV `id` fields in wrangler.toml |
| CORS errors | Set correct `ALLOWED_ORIGINS` URL |
| Schema errors | Run `npm run db:schema` |

## 📚 Key Files

- `wrangler.toml` - Main configuration
- `schema.sql` - Database structure
- `populate-sentences.js` - Sample sentences
- `setup-cloudflare.js` - Automated setup
- `validate-config.js` - Configuration checker

## 🎯 Next Steps

1. Update GitHub Pages URL in wrangler.toml
2. Deploy with `npm run deploy`
3. Update frontend API endpoints
4. Test end-to-end functionality