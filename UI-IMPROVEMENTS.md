# UI Improvements Summary

## Overview

Enhanced the playground and navigation to provide a better testing workflow with test sets, persistent settings, and real-time run monitoring.

## Implemented Features

### 1. **Rollouts Always Visible** ✓

**What Changed:**
- Rollouts input is now always visible, regardless of whether using test sets or generating scenarios
- Moved to its own section with clear labeling and help text

**Why:**
- Rollouts are independent of scenario generation
- Users should be able to control variance estimation whether using test sets or not

**UI Location:**
- Configuration panel → "Rollouts per Scenario" input
- Appears after template selection, before test set toggle

---

### 2. **LocalStorage Persistence** ✓

**What Changed:**
- All playground settings are now saved to browser localStorage
- Settings persist across page refreshes and browser sessions

**Settings Saved:**
- Model selection
- Prompt template
- Test set usage (on/off)
- Selected test set
- Scenario count
- Rollouts per scenario
- Narrative generation toggle
- Narrative model

**Implementation:**
- Initial state loads from localStorage
- Changes automatically save on state update
- Works in SSR-safe way (checks `window !== undefined`)

---

### 3. **Default to Test Set Mode** ✓

**What Changed:**
- "Use Test Set" toggle now defaults to ON
- First available test set is auto-selected
- Users can still opt-in to generating scenarios

**Why:**
- Encourages best practice of using fixed test sets
- Faster benchmarking (no narrative generation)
- Better reproducibility

**Fallback:**
- If no test sets exist, gracefully handles empty state
- Clear message: "No test sets available"

---

### 4. **Stay on Page After Benchmark** ✓

**What Changed:**
- Two benchmark buttons: "Run Benchmark" and "Run & Stay"
- "Run Benchmark" → navigates to run page (original behavior)
- "Run & Stay" → stays on playground, shows success message

**Success Banner:**
When staying on page, shows green banner with:
- ✓ Benchmark started confirmation
- "View Run" button → navigate to run details
- "Run Another" button → start another benchmark with same settings

**Benefits:**
- Rapid iteration on same test set
- Compare multiple configurations quickly
- No need to navigate back and forth

---

### 5. **Navbar Run Status Indicator** ✓

**What Changed:**
- New status indicator in top-right of navbar
- Shows real-time status of benchmark runs
- Updates automatically via polling (every 3 seconds)

**Visual States:**

**Green Dot (Idle):**
- All runs completed
- Steady green indicator
- Shows count of recent runs

**Yellow Flashing Dot (Active):**
- One or more runs in progress
- Pulsing yellow animation with ping effect
- Draws attention to active work

**Dropdown Menu:**
- Click indicator to see recent runs
- Shows up to 3 runs, prioritized by:
  1. Running jobs first
  2. Generating narratives second
  3. Completed jobs last
  4. Then by recency

**Run Details in Dropdown:**
Each run shows:
- Model name (e.g., "gemini-3-flash-preview")
- Status with color coding:
  - 🟡 Running (amber)
  - 🟣 Generating (purple)
  - 🟢 Completed (emerald)
- Prompt strategy
- Test set name (if used) in blue
- Hit rate percentage (if completed)

**Scrollable:**
- Max height 300px
- Scrollable if more than 3 runs

---

## Technical Implementation

### Polling System
```typescript
// Polls every 3 seconds
useEffect(() => {
  const fetchRuns = async () => {
    const res = await fetch("/api/runs");
    const data = await res.json();
    setRuns(data);
  };

  fetchRuns();
  const interval = setInterval(fetchRuns, 3000);
  return () => clearInterval(interval);
}, []);
```

### Priority Sorting
```typescript
const statusPriority = (run: BenchmarkRun) => {
  if (run.status === "running") return 3;
  if (run.status === "generating_narratives") return 2;
  if (run.status === "completed") return 1;
  return 0;
};
```

### LocalStorage Pattern
```typescript
// Load initial state
const [useTestSet, setUseTestSet] = useState<boolean>(() =>
  typeof window !== 'undefined'
    ? localStorage.getItem('playground_useTestSet') !== 'false'
    : true
);

// Save on change
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('playground_useTestSet', String(useTestSet));
  }
}, [useTestSet]);
```

---

## User Workflows

### Workflow 1: Rapid Testing
1. Open `/playground`
2. Test set auto-selected (remembered from last session)
3. Adjust rollouts if needed
4. Click "Run & Stay"
5. Wait for benchmark to start
6. Click "Run Another" to test different model/prompt
7. Repeat without leaving page

### Workflow 2: Monitor Active Jobs
1. Start benchmark from playground
2. Navigate anywhere in app
3. Check navbar indicator for status
4. Yellow flashing = still running
5. Click to see which jobs are active
6. Click job to view details

### Workflow 3: Quick Access to Recent Runs
1. Look at navbar indicator
2. Click to open dropdown
3. See 3 most recent/important runs
4. Click any run to view full details
5. Hit rates shown inline for quick comparison

---

## Visual Design

### Colors & States
- **Green:** Completed runs, success states
- **Yellow/Amber:** Running jobs, active work
- **Purple:** Narrative generation in progress
- **Blue:** Test set indicators
- **Emerald:** Hit rates and positive metrics

### Animations
- **Pulse:** Gentle breathing effect on yellow dot
- **Ping:** Expanding ring effect for active jobs
- **Transitions:** Smooth color changes on hover

### Typography
- **Monospace:** Numbers, percentages, model names
- **Sans-serif:** Labels, descriptions
- **Medium weight:** Active/selected items
- **Muted:** Secondary information

---

## Benefits Summary

### For Users
✅ **Faster Iteration** - Stay on page, run multiple tests
✅ **Better Defaults** - Test sets by default, saved settings
✅ **Real-time Feedback** - See job status without navigation
✅ **Easy Comparison** - Quick access to recent runs
✅ **Persistent Settings** - Never lose your configuration

### For Testing
✅ **Controlled Experiments** - Test sets encouraged
✅ **Rollout Flexibility** - Always control variance testing
✅ **Batch Testing** - Run multiple configs easily
✅ **Status Visibility** - Know what's running at all times

### For Development
✅ **Standard Patterns** - LocalStorage, polling, state management
✅ **Clean UI** - Minimal, focused, task-oriented
✅ **Extensible** - Easy to add more status types
✅ **Performant** - Efficient polling, optimized rendering

---

## Configuration Persistence

All settings automatically saved:

| Setting | LocalStorage Key | Default |
|---------|------------------|---------|
| Model | `playground_model` | openai/gpt-4o-mini |
| Template | `playground_template` | First template |
| Use Test Set | `playground_useTestSet` | `true` |
| Test Set | `playground_testSet` | First test set |
| Scenarios | `playground_scenarioCount` | 5 |
| Rollouts | `playground_rollouts` | 3 |
| Narratives | `playground_narratives` | `true` |
| Narrative Model | `playground_narrativeModel` | openai/gpt-4o-mini |

---

## Future Enhancements

Potential improvements:
- [ ] Notification sound when benchmark completes
- [ ] Desktop notifications (opt-in)
- [ ] Benchmark queue (schedule multiple runs)
- [ ] Keyboard shortcuts (e.g., Cmd+R to run)
- [ ] Export/import settings
- [ ] Preset configurations
- [ ] Run comparison view from navbar dropdown

---

## Testing Checklist

To verify all features work:

- [ ] Open playground, verify test set is selected by default
- [ ] Change settings, refresh page, verify settings persist
- [ ] Run benchmark with "Run & Stay"
- [ ] Verify success banner appears
- [ ] Click "Run Another", verify new run starts
- [ ] Navigate to dashboard
- [ ] Verify navbar shows active run (yellow flashing)
- [ ] Click navbar indicator
- [ ] Verify dropdown shows active run
- [ ] Wait for run to complete
- [ ] Verify indicator turns green
- [ ] Verify completed run shows hit rate
- [ ] Click run in dropdown, verify navigation works
