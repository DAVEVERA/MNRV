# 🔄 MNRV WordPress Migration Guide

## Your Situation
- **Current:** mnrv.nl is on WordPress
- **New:** Windows 95 themed static HTML site (ready to deploy)

You have 3 options:

---

## Option 1: Replace WordPress with Static Site ⭐ RECOMMENDED

**Why:** Faster, better SEO, no maintenance, no security issues, no hosting costs

### Pros:
- ✅ 10x faster page loads
- ✅ Better SEO rankings (speed matters!)
- ✅ No WordPress updates/maintenance
- ✅ No security vulnerabilities
- ✅ Free hosting (Netlify/Vercel)
- ✅ Lower hosting costs
- ✅ This Win95 design is unique & memorable

### Cons:
- ❌ Lose WordPress admin panel
- ❌ Need to edit HTML files directly (or use Git)
- ❌ Lose existing WordPress content (if any)

### Steps to Replace WordPress:

#### Step 1: Backup Current WordPress (IMPORTANT!)
```
1. Login to WordPress admin (mnrv.nl/wp-admin)
2. Install "All-in-One WP Migration" plugin
3. Export entire site
4. Download backup file
5. Store safely (you can restore if needed)
```

#### Step 2: Check What's on Current Site
```
1. Visit mnrv.nl
2. Note what content exists:
   - Blog posts?
   - Pages?
   - Products?
   - Important content?
3. Save/screenshot anything you want to keep
```

#### Step 3: Choose Deployment Method

**Method A: Keep Same Hosting, Replace Files**
```
1. Login to your hosting (cPanel/FTP)
2. Backup public_html folder
3. Delete everything in public_html (except backup!)
4. Upload your new MNRV files
5. Done! mnrv.nl now shows Win95 site
```

**Method B: Move to Netlify (Better Performance)**
```
1. Deploy to Netlify (see QUICK-START.md)
2. In Netlify, add custom domain: mnrv.nl
3. Update DNS records at domain registrar
4. Point mnrv.nl to Netlify
5. Cancel old WordPress hosting (save money!)
```

#### Step 4: Update DNS (if using Netlify/Vercel)
```
At your domain registrar (where you manage mnrv.nl):

1. Login
2. Find DNS settings
3. Update A record:
   Type: A
   Name: @
   Value: [Netlify IP - they'll give you this]

4. Update CNAME:
   Type: CNAME
   Name: www
   Value: your-site.netlify.app

5. Save and wait 1-24 hours for DNS propagation
```

#### Step 5: Verify
```
1. Visit https://mnrv.nl
2. Should show your new Win95 site!
3. Test all pages
4. Celebrate! 🎉
```

---

## Option 2: Keep WordPress, Add Win95 Site as Subdomain

**Setup:** WordPress on mnrv.nl, Win95 site on win95.mnrv.nl or app.mnrv.nl

### Pros:
- ✅ Keep existing WordPress site
- ✅ Add Win95 experience as separate showcase
- ✅ Best of both worlds

### Cons:
- ❌ Split content across two sites
- ❌ Keep paying for WordPress hosting

### Steps:

#### 1. Deploy Win95 Site to Netlify
```
1. Go to https://app.netlify.com/drop
2. Drag MNRV folder
3. Get URL: random-name.netlify.app
```

#### 2. Create Subdomain
```
In Netlify:
1. Add custom domain: win95.mnrv.nl (or app.mnrv.nl)

In your DNS settings:
1. Add CNAME record:
   Type: CNAME
   Name: win95
   Value: your-site.netlify.app
```

#### 3. Link from WordPress
```
In WordPress:
1. Create menu item: "Experience Win95"
2. Link to: https://win95.mnrv.nl
3. Or add button on homepage
```

---

## Option 3: Convert to WordPress Theme (Most Complex)

**Setup:** Convert Win95 HTML to WordPress theme

### Pros:
- ✅ Keep WordPress admin
- ✅ Easy content updates
- ✅ Win95 design

### Cons:
- ❌ Complex conversion process (2-3 days work)
- ❌ Slower than static site
- ❌ Still need WordPress hosting

### Required Steps:
```
1. Create WordPress theme structure
2. Convert HTML to PHP templates
3. Split into header.php, footer.php, etc.
4. Integrate WordPress Loop
5. Add functions.php
6. Style with WordPress classes
7. Test extensively

This is 10-20 hours of work!
```

**Recommendation:** Not worth it unless you REALLY need WordPress admin

---

## 🎯 My Recommendation: Option 1 (Replace WordPress)

### Why?

**Your Win95 site is:**
- Static HTML (perfect as-is)
- Fast & SEO-optimized
- Unique design (memorable!)
- Easy to update (edit HTML files)

**WordPress is:**
- Overkill for a portfolio/business site
- Slower (database queries, PHP processing)
- Requires updates, security patches
- Costs more (hosting fees)
- More complex to maintain

### Migration Checklist

#### Before You Start:
- [ ] Backup WordPress site completely
- [ ] Screenshot/save any content you want to keep
- [ ] Check if you have email on this hosting (save settings!)
- [ ] Note down any important WordPress plugins/settings

#### Migration Day:
- [ ] Choose hosting (Netlify recommended)
- [ ] Deploy Win95 site
- [ ] Update DNS records
- [ ] Test thoroughly
- [ ] Verify email still works (if using same host)

#### After Migration:
- [ ] Submit new site to Google Search Console
- [ ] Update sitemap
- [ ] Monitor for 1 week
- [ ] Cancel old WordPress hosting (save money!)

---

## 💰 Cost Comparison

### Current (WordPress):
```
Hosting: €5-15/month
Domain: €10-15/year
Total: €70-200/year
```

### After (Static on Netlify):
```
Hosting: FREE (Netlify)
Domain: €10-15/year
Total: €10-15/year

SAVINGS: €60-185/year! 💸
```

---

## ⚠️ Important: Don't Lose Content

### Before Replacing WordPress:

#### 1. Check for Important Content
```
Visit your current mnrv.nl and check:
- [ ] Are there blog posts?
- [ ] Product pages?
- [ ] Customer testimonials?
- [ ] Contact form submissions?
- [ ] Important images/media?
```

#### 2. Save What You Need
```
If you have content to keep:
1. Copy text content to documents
2. Download all images from Media Library
3. Export contact form entries
4. Save any custom code/settings
```

#### 3. Integrate into New Site (If Needed)
```
Add to your new HTML site:
- Create blog.html if you had blog posts
- Add testimonials to diensten.html
- Import images to img/ folder
- Re-create contact form
```

---

## 🚀 Quick Migration (Step-by-Step)

### If Your Current WordPress is Empty/Basic:

**Total Time: 30 minutes**

#### Step 1: Backup WordPress (5 min)
```
1. Login: mnrv.nl/wp-admin
2. Install: All-in-One WP Migration
3. Export site
4. Download backup
```

#### Step 2: Check Your Hosting (2 min)
```
Do you have:
- [ ] cPanel access?
- [ ] FTP credentials?
- [ ] Can you delete files?

If YES → Use Method A (same hosting)
If NO → Use Method B (Netlify)
```

#### Step 3A: Replace on Same Hosting (15 min)
```
1. Login to cPanel/FTP
2. Navigate to public_html
3. Download everything (backup!)
4. Delete all WordPress files (keep backup!)
5. Upload your MNRV files
6. Visit mnrv.nl → See Win95 site!
```

#### Step 3B: Move to Netlify (15 min)
```
1. Deploy to Netlify (see QUICK-START.md)
2. Add domain: mnrv.nl
3. Update DNS records
4. Wait 1-24 hours
5. Visit mnrv.nl → See Win95 site!
```

#### Step 4: Post-Migration (5 min)
```
1. Test all pages
2. Check mobile version
3. Submit to Google Search Console
4. Update social media links
5. Celebrate! 🎉
```

---

## 🆘 What If Things Go Wrong?

### Problem: Site Doesn't Load
**Solution:**
```
1. Check DNS propagation: https://dnschecker.org
2. Wait longer (DNS can take 24-48 hours)
3. Clear browser cache
4. Try incognito/private mode
```

### Problem: Lost WordPress Content
**Solution:**
```
1. Restore from backup (All-in-One WP Migration)
2. Or restore files via cPanel/FTP
3. Your backup is safe!
```

### Problem: Email Stopped Working
**Solution:**
```
1. Check MX records in DNS
2. Ensure email settings unchanged
3. Contact hosting support
4. May need to update email DNS records
```

### Problem: Want WordPress Back
**Solution:**
```
1. Keep WordPress backup
2. Can always restore it
3. Or run both (WordPress + Win95 subdomain)
```

---

## 📞 Need Help Deciding?

### Choose Option 1 (Replace WordPress) if:
- ✅ WordPress site is basic/empty
- ✅ You want faster performance
- ✅ You want to save money
- ✅ You're comfortable editing HTML files
- ✅ You want best SEO results

### Choose Option 2 (Subdomain) if:
- ✅ You have important WordPress content
- ✅ Want to keep blog functionality
- ✅ Need WordPress admin panel
- ✅ Budget allows two hosting costs
- ✅ Want to test Win95 site first

### Choose Option 3 (Theme) if:
- ✅ You REALLY need WordPress
- ✅ Have development skills/budget
- ✅ Need dynamic content management
- ❌ **Warning:** This is complex & time-consuming!

---

## My Recommendation for You

Based on your situation:

1. **Check your current WordPress site** (visit mnrv.nl)
2. **If it's empty/basic** → Go with Option 1 (replace)
3. **If it has important content** → Save content first, then replace
4. **If unsure** → Go with Option 2 (subdomain) to test

**Most likely:** Your WordPress is either:
- Empty/default install
- Basic placeholder
- Old content you don't need

In that case: **Replace it!** Your new Win95 site is better in every way.

---

## 🎯 Action Plan

### Today:
1. **Visit your current mnrv.nl**
2. **Screenshot/note what's there**
3. **Backup WordPress** (just in case)
4. **Decide:** Replace, subdomain, or convert?

### Tomorrow:
5. **Deploy your Win95 site**
6. **Test everything**
7. **Submit to search engines**

### This Week:
8. **Monitor performance**
9. **Update social media links**
10. **Start SEO growth strategy**

---

## 🚨 Critical: Do This First!

**Before anything else:**

```bash
1. Visit: https://mnrv.nl
2. Login: https://mnrv.nl/wp-admin
3. Check what's there
4. Backup everything
5. THEN proceed with migration
```

**Don't delete anything until you have a backup!**

---

## Questions to Answer

Before we proceed, tell me:

1. **What's currently on mnrv.nl?**
   - Empty WordPress?
   - Active blog?
   - Products/portfolio?
   - Just placeholder?

2. **Do you have hosting access?**
   - cPanel?
   - FTP?
   - Can you access files?

3. **What's your preference?**
   - Replace WordPress completely? (faster, cheaper)
   - Keep both (WordPress + Win95 subdomain)?
   - Convert to WordPress theme? (complex)

**Answer these and I'll give you the exact steps for your situation!**

---

## Ready to Migrate?

Once you've backed up WordPress and decided on your approach:

- Read: `QUICK-START.md` for deployment steps
- Read: `DEPLOYMENT-GUIDE.md` for SEO strategy
- Come back here for WordPress-specific steps

**You've got this!** 🚀

---

**Last Updated:** February 11, 2026
**For:** MNRV WordPress → Static Site Migration
