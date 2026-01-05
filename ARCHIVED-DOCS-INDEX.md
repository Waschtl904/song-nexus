# 📦 ARCHIVED DOCUMENTATION INDEX
**DATUM:** 5. Januar 2026, 20:46 CET  
**STATUS:** These files are archived for historical reference only  
**PRIMARY SOURCE:** Use `MASTER-PROMPT-2026-DEFINITIVE.md` instead  

---

## 📋 WHY ARCHIVED?

```
✅ MASTER-PROMPT-2026-DEFINITIVE.md is the SINGLE SOURCE OF TRUTH
❌ All other docs were creating confusion & regressions
📦 Archived but kept = historical reference + no active confusion
```

---

## 📦 ARCHIVED FILES REFERENCE

### Master Prompts (Superseded)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **SONG-NEXUS-Master-v10.md** | 10.2 KB | Webpack-focused (outdated) | MASTER-PROMPT-2026-DEFINITIVE |
| **SONG-NEXUS-Master-v11.md** | 3.8 KB | Incomplete/Too short | MASTER-PROMPT-2026-DEFINITIVE |
| **MASTER-ENTRY-PROMPT.md** | 12.2 KB | Design-system only (partial) | MASTER-PROMPT-2026-DEFINITIVE |
| **MASTER-PROMPT-2026-AKTUELL.md** | 14 KB | Early draft (superseded) | MASTER-PROMPT-2026-DEFINITIVE |
| **MASTER-PROMPT-2026-REAL.md** | 11.2 KB | Early draft (superseded) | MASTER-PROMPT-2026-DEFINITIVE |

**Reason:** Multiple competing versions caused knowledge fragmentation. DEFINITIVE consolidates all into one verified source.

---

### Implementation Plans (Outdated)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **IMPLEMENTATION-CHECKLIST.md** | 10.8 KB | 6-week plan from Dec 2025 (now Jan 2026, plan outdated) | MASTER-PROMPT-2026-DEFINITIVE (status section) |
| **IMPLEMENTATION-CHECKLIST-v2.md** | 5.5 KB | Phase-based, unclear current phase | MASTER-PROMPT-2026-DEFINITIVE |
| **DESIGN-SYSTEM-ROADMAP.md** | 12.1 KB | 6-week plan (if phases complete, roadmap obsolete) | MASTER-PROMPT-2026-DEFINITIVE (design system section) |

**Reason:** Time-dependent documents from December. January status is now different. DEFINITIVE has current status.

---

### Designer Guides (Redundant)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **DESIGNER-QUICK-REF.md** | 6.6 KB | Duplicate info spread across multiple guides | MASTER-PROMPT-2026-DEFINITIVE (design system section) |
| **DESIGNER-QUICK-REF-v2.md** | 9 KB | More detailed but still incomplete vs DEFINITIVE | MASTER-PROMPT-2026-DEFINITIVE |
| **DESIGNER-CONTROL-SYSTEM.md** | 18.7 KB | Webpack loader specifics (too technical, duplicated) | MASTER-PROMPT-2026-DEFINITIVE |
| **DESIGNER-ANLEITUNG-DE.md** | 12.4 KB | German version (duplicated content) | MASTER-PROMPT-2026-DEFINITIVE |

**Reason:** Design system was explained in 4 different ways. DEFINITIVE has consolidated, cleaner version.

---

### Deployment Guides (Need Update)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **DEPLOYMENT-SCHRITT-FUR-SCHRITT.md** | 13.2 KB | German guide, may be outdated | PRODUCTION-DEPLOYMENT.md (at root) |
| **ONLINE-DEPLOYMENT-GUIDE.md** | 14.6 KB | Duplicate of above | PRODUCTION-DEPLOYMENT.md |
| **SICHERHEIT-PRIVATER-ZUGRIFF.md** | 9 KB | Security-specific, niche use case | MASTER-PROMPT-2026-DEFINITIVE (known issues section) |

**Reason:** Deployment is documented in PRODUCTION-DEPLOYMENT.md at root. No need for duplicates.

---

### Analysis & Documentation (Historical)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **ANALYSIS-PART2-JS-MODULES.md** | 7.3 KB | WebAuthn analysis (still relevant) | Keep as reference for WebAuthn deep-dive |
| **API-Documentation-v1.md** | 17.9 KB | API endpoints (APIs don't change often) | Keep as reference for endpoint details |
| **PROJEKTUEBERGABE-GUIDE.md** | 15 KB | Handoff guide (historical snapshot) | Reference only |
| **README-START-HERE.md** | 7.9 KB | Getting started (generic) | README.md (at root) |

**Status:** Keep but don't rely on as primary source. DEFINITIVE is the source of truth.

---

### Snapshots & Summaries (Obsolete)
| File | Size | Reason | Use Instead |
|------|------|--------|-------------|
| **FINAL-FILE-INVENTORY.md** | 7.7 KB | Point-in-time snapshot (outdated) | REPOSITORY-STRUCTURE.md |
| **FINAL-COMPREHENSIVE-AUDIT.md** | 7.7 KB | Code audit snapshot (outdated) | Code itself + MASTER-PROMPT-2026-DEFINITIVE |
| **DELIVERABLES-SUMMARY.md** | 10.7 KB | Project status snapshot (outdated) | MASTER-PROMPT-2026-DEFINITIVE (current status) |
| **DELIVERABLES-SUMMARY-v2.md** | 7.9 KB | Project status snapshot v2 (outdated) | MASTER-PROMPT-2026-DEFINITIVE |

**Reason:** Snapshots are point-in-time. Current state is in DEFINITIVE.

---

## 🗂️ FILE ORGANIZATION

### Root Level (Active Documentation)
```
✅ MASTER-PROMPT-2026-DEFINITIVE.md    ← USE THIS EVERY CHAT!
✅ REPOSITORY-STRUCTURE.md              ← File listing
✅ README.md                            ← Project overview
✅ DATABASE.md                          ← Database documentation
✅ PRODUCTION-DEPLOYMENT.md             ← Deployment guide
✅ ARCHIVED-DOCS-INDEX.md               ← This file
```

### Root Level (Configuration)
```
✅ schema.sql                           ← Database schema (AUTHORITATIVE)
✅ package.json                         ← Dependencies
✅ .env.production                      ← Production config
✅ sync-repo.ps1                        ← PowerShell sync script
```

### Archive Folder (Historical Reference)
```
📦 /archived/
  ├── Master-Prompts/
  │   ├── SONG-NEXUS-Master-v10.md
  │   ├── SONG-NEXUS-Master-v11.md
  │   ├── MASTER-ENTRY-PROMPT.md
  │   ├── MASTER-PROMPT-2026-AKTUELL.md
  │   └── MASTER-PROMPT-2026-REAL.md
  ├── Implementation-Plans/
  │   ├── IMPLEMENTATION-CHECKLIST.md
  │   ├── IMPLEMENTATION-CHECKLIST-v2.md
  │   └── DESIGN-SYSTEM-ROADMAP.md
  ├── Designer-Guides/
  │   ├── DESIGNER-QUICK-REF.md
  │   ├── DESIGNER-QUICK-REF-v2.md
  │   ├── DESIGNER-CONTROL-SYSTEM.md
  │   └── DESIGNER-ANLEITUNG-DE.md
  ├── Deployment-Guides/
  │   ├── DEPLOYMENT-SCHRITT-FUR-SCHRITT.md
  │   ├── ONLINE-DEPLOYMENT-GUIDE.md
  │   └── SICHERHEIT-PRIVATER-ZUGRIFF.md
  ├── Analysis-Docs/
  │   ├── ANALYSIS-PART2-JS-MODULES.md
  │   ├── API-Documentation-v1.md
  │   ├── PROJEKTUEBERGABE-GUIDE.md
  │   └── README-START-HERE.md
  └── Snapshots/
      ├── FINAL-FILE-INVENTORY.md
      ├── FINAL-COMPREHENSIVE-AUDIT.md
      ├── DELIVERABLES-SUMMARY.md
      └── DELIVERABLES-SUMMARY-v2.md
```

---

## 🔍 FINDING INFO IN ARCHIVED FILES

### If you need WebAuthn details:
```
✅ Primary: MASTER-PROMPT-2026-DEFINITIVE.md (WebAuthn Flow section)
📦 Deep-dive: /archived/Analysis-Docs/ANALYSIS-PART2-JS-MODULES.md
```

### If you need API endpoints:
```
✅ Primary: MASTER-PROMPT-2026-DEFINITIVE.md (API Endpoints section)
📦 Details: /archived/Analysis-Docs/API-Documentation-v1.md
```

### If you need design system info:
```
✅ Primary: MASTER-PROMPT-2026-DEFINITIVE.md (Design System section)
📦 Quick-ref: /archived/Designer-Guides/DESIGNER-QUICK-REF-v2.md
📦 Deep-dive: /archived/Designer-Guides/DESIGNER-CONTROL-SYSTEM.md
```

### If you need deployment info:
```
✅ Primary: PRODUCTION-DEPLOYMENT.md (at root)
📦 Reference: /archived/Deployment-Guides/ONLINE-DEPLOYMENT-GUIDE.md
```

---

## ⚠️ IMPORTANT RULES

```
✅ DO:
  - Use MASTER-PROMPT-2026-DEFINITIVE.md for everything
  - Copy it into new chat sessions for context
  - Reference archived files ONLY for deep-dive context
  - Update DEFINITIVE if something changes

❌ DON'T:
  - Treat archived files as current documentation
  - Make decisions based on old docs
  - Update archived files (they're frozen)
  - Create new master prompts (use DEFINITIVE only)
```

---

## 🚀 WORKFLOW

### Starting a New Chat
```powershell
1. Copy MASTER-PROMPT-2026-DEFINITIVE.md entirely
2. Paste at start of your chat message
3. Ask your question
4. Context preserved ✅ No regressions ✅
```

### Needing Historical Context
```powershell
1. Check MASTER-PROMPT-2026-DEFINITIVE.md first
2. If need more details, check specific archived file
3. Bring findings back to DEFINITIVE
4. Update DEFINITIVE if reality changed
```

### Something Changed in Code
```powershell
1. Update MASTER-PROMPT-2026-DEFINITIVE.md
2. Push to GitHub
3. Copy new version into next chat
4. Don't touch archived files
```

---

## 📊 SUMMARY TABLE

| Category | Count | Status | Action |
|----------|-------|--------|--------|
| **Master Prompts** | 5 | ❌ Obsolete | Archive |
| **Implementation Plans** | 3 | ❌ Outdated | Archive |
| **Designer Guides** | 4 | ⚠️ Redundant | Archive |
| **Deployment Guides** | 3 | ⚠️ Duplicate | Archive (keep PRODUCTION-DEPLOYMENT.md) |
| **Analysis Docs** | 4 | ✅ Keep | Archive (reference) |
| **Snapshots** | 4 | ❌ Obsolete | Archive |
| **Total** | **23** | 📦 Archived | ✅ Cleaned up |

---

## ✅ CURRENT STATE (After Cleanup)

```
❌ BEFORE (Chaos):
   - 23 overlapping documentation files
   - Multiple master prompts (confusing)
   - Duplicate design system guides
   - Outdated implementation plans
   - Time-dependent snapshots
   - Regressions from old info

✅ AFTER (Clean):
   - 1 Master Prompt (DEFINITIVE)
   - 1 Repository Structure (REPOSITORY-STRUCTURE.md)
   - 1 Database Doc (DATABASE.md)
   - 1 Deployment Guide (PRODUCTION-DEPLOYMENT.md)
   - 1 Archive Index (this file)
   - 23 archived files (for reference)
   - NO regressions possible (single source of truth)
```

---

## 🎯 NEXT STEPS

1. ✅ Review this index
2. ✅ Move all archived files to `/archived/` folder (via git)
3. ✅ Copy MASTER-PROMPT-2026-DEFINITIVE into every future chat
4. ✅ Enjoy stable development with no regressions!

---

**Created:** 5. Januar 2026, 20:46 CET  
**Purpose:** Document why files are archived + how to use them  
**Maintenance:** Update when moving files to archive  
**Authority:** MASTER-PROMPT-2026-DEFINITIVE.md is the source of truth  
