# Gym App — Task Plan

> A desktop-first workout tracker inspired by Strong, with AI integration for workout planning and Claude Code CLI access.

---

## Task Overview

| ID | Task | Dependencies | Status | User Action? |
|----|------|-------------|--------|--------------|
| **SETUP** | | | | |
| S1 | Initialize Next.js + TypeScript project | — | Done | |
| S2 | Install & configure Tailwind CSS + ShadCN UI | S1 | Done | |
| S3 | Install & configure Prisma ORM + PostgreSQL | S1 | Done | |
| S4 | App shell — layout, sidebar navigation, theme provider | S2 | Done | |
| S5 | Dark mode / theme toggle | S4 | Done | |
| **DATABASE** | | | | |
| D1 | Design complete database schema (all models) | S3 | Done | |
| D2 | Create & run initial migrations | D1 | Done | |
| D3 | Seed exercise library (muscle groups + common exercises) | D2 | Done | |
| **API LAYER** | | | | |
| A1 | Exercise CRUD — server actions & API routes | D2 | Done | |
| A2 | Program CRUD — server actions & API routes | D2 | Done | |
| A3 | Workout CRUD — server actions & API routes | D2 | Done | |
| A4 | Set & workout session log API | D2 | Done | |
| A5 | Exercise notes API (create, pin, list) | D2 | Done | |
| **EXERCISE LIBRARY** | | | | |
| E1 | Exercise list page — muscle group & equipment filters, search | S4, A1 | Done | |
| E2 | Exercise detail page — info, placeholder for history | E1 | Done | |
| E3 | Google Imagen integration — generate exercise images | A1 | | **Yes** — API key |
| E4 | Exercise history graphs & analytics per exercise | E2, A4 | Done | |
| **PROGRAMS** | | | | |
| P1 | Program list page | S4, A2 | Done | |
| P2 | Program create/edit page with defaults (rest time, set structure, warm-up %) | P1 | Done | |
| P3 | Periodization support — phases, durations, cycling logic | P2 | Done | |
| P4 | Simple program support — repeating day split | P2 | Done | |
| **WORKOUT PLANNING** | | | | |
| W1 | Workout create/edit page | S4, A3, A1 | Done | |
| W2 | Add exercises to workout — set count, warm-up/working sets config | W1 | Done | |
| W3 | Workout detail view — full exercise list with set breakdown | W2 | Done | |
| **LIVE WORKOUT SESSION** | | | | |
| L1 | Workout session page — timer display, exercise list | W3, A4 | Done | |
| L2 | Set logging — weight & reps input with quick-entry UX | L1 | Done | |
| L3 | Rest timer — countdown between sets with notification | L1 | Done | |
| L4 | Auto-start session on first data entry | L2 | Done | |
| L5 | Auto-end session after 30 min inactivity | L4 | Done | |
| L6 | 1RM calculation engine & display | L2 | Done | |
| **NOTES** | | | | |
| N1 | Exercise notes UI — add note per exercise in workout | A5, L1 | Done | |
| N2 | Pin notes — pinned notes displayed at top | N1 | Done | |
| N3 | Notes history — view all past notes for an exercise | N1 | Done | |
| **HISTORY & ANALYTICS** | | | | |
| H1 | Workout history page — list & calendar view | S4, A4 | Done | |
| H2 | Edit past workouts | H1 | Done | |
| H3 | Personal records tracking & display | L6, H1 | Done | |
| H4 | Progress charts — volume, strength trends over time | H1, E4 | Done | |
| **AI FEATURES** | | | | |
| AI1 | AI workout planning — generate workout from natural language prompt | W2 | Done | |
| AI2 | CLI/API endpoint — add workouts & exercises via Claude Code | A3, A1 | Done | |
| AI3 | AI exercise population — bulk-add exercises via AI | A1 | Done | |
| **POLISH** | | | | |
| PO1 | Dashboard / home page — upcoming workout, recent history, PRs | H1, P1 | | |
| PO2 | Responsive design pass — mobile-friendly layouts | All UI | | |
| PO3 | Loading states, error handling, toast notifications | All UI | | |

---

## Parallelization Guide

### What can run in parallel

```
S1
├── S2 ──► S4 ──► S5
│          │
│          ├── E1, P1, W1, H1  (all UI pages, once shell is ready)
│
└── S3 ──► D1 ──► D2 ──► D3
                   │
                   ├── A1 ─┐
                   ├── A2 ─┤  (all 5 API tasks in parallel)
                   ├── A3 ─┤
                   ├── A4 ─┤
                   └── A5 ─┘
```

Once **S4** (app shell) and **A1-A5** (APIs) are complete, **all UI feature pages** can be built in parallel:
- Exercise library (E1 → E2 → E4)
- Programs (P1 → P2 → P3 + P4)
- Workout planning (W1 → W2 → W3)
- History (H1 → H2)
- Notes (N1 → N2 + N3)

The **live workout session** (L1-L6) is the main serial chain and the core of the app.

**AI features** (AI1, AI2, AI3) can be built once their API dependencies are done — they don't block any other work.

### Critical path

```
S1 → S3 → D1 → D2 → A3 + A4 → W1 → W2 → W3 → L1 → L2 → L4 → L5
                                                       └── L3 (rest timer)
                                                       └── L6 (1RM calc)
```

The longest chain runs through setup → schema → workout API → workout UI → live session.

---

## Task Details

### S1 — Initialize Next.js + TypeScript

Create the Next.js project with App Router, TypeScript, ESLint. Standard project scaffold.

### S2 — Tailwind CSS + ShadCN UI

Install and configure ShadCN with the default theme. Install core components: button, input, card, dialog, sheet, table, tabs, dropdown-menu, select, badge, toast, separator, skeleton, popover, calendar, chart.

### S3 — Prisma + PostgreSQL

Install Prisma, configure `DATABASE_URL` for local PostgreSQL, create initial `prisma/schema.prisma`. Ensure local Postgres is running.

### S4 — App Shell

Create the main layout with:
- Sidebar navigation (Dashboard, Programs, Workouts, Exercises, History)
- Top bar with theme toggle
- Responsive sidebar (collapsible on smaller screens)
- Breadcrumb navigation

### S5 — Dark Mode

Wire up `next-themes` with ShadCN's theme provider. Toggle in nav bar. Persist preference.

---

### D1 — Database Schema

Design all Prisma models. Key entities:

```
MuscleGroup
  - id, name, displayOrder

Equipment
  - id, name (Barbell, Dumbbell, Machine, Cable, Bodyweight, etc.)

Exercise
  - id, name, description, muscleGroupId, secondaryMuscleGroups[], equipmentId
  - imageUrl (nullable — filled by Imagen)
  - createdAt, updatedAt

Program
  - id, name, description
  - type: PERIODIZED | SIMPLE
  - defaultRestSeconds (default rest between sets)
  - defaultWarmUpSets (e.g., 1)
  - defaultWorkingSets (e.g., 3)
  - defaultWarmUpPercentage (e.g., 0.6 = 60% of working weight)
  - createdAt, updatedAt

ProgramPhase (for periodized programs)
  - id, programId, name (e.g., "Hypertrophy", "Strength", "Peaking", "Deload")
  - orderIndex, durationWeeks
  - description

ProgramWorkout
  - id, programId, phaseId (nullable — null for SIMPLE programs)
  - dayIndex (e.g., Day 1, Day 2)
  - name (e.g., "Push Day", "Upper Body")
  - orderIndex

ProgramWorkoutExercise
  - id, programWorkoutId, exerciseId
  - orderIndex
  - warmUpSets (override or null = use program default)
  - workingSets (override or null = use program default)
  - warmUpPercentage (override or null = use program default)
  - targetReps (e.g., 8-12)
  - restSeconds (override or null = use program default)

WorkoutSession
  - id, programWorkoutId (nullable — can be ad-hoc)
  - startedAt, endedAt (nullable until finished)
  - status: PLANNED | IN_PROGRESS | COMPLETED
  - notes

WorkoutSessionExercise
  - id, workoutSessionId, exerciseId
  - orderIndex

WorkoutSet
  - id, workoutSessionExerciseId
  - setType: WARM_UP | WORKING
  - weight (nullable), reps (nullable)
  - completedAt (nullable)
  - orderIndex

ExerciseNote
  - id, exerciseId, workoutSessionId (nullable — can be general)
  - content
  - isPinned
  - createdAt

PersonalRecord
  - id, exerciseId
  - weight, reps, estimated1RM
  - achievedAt, workoutSessionId
```

### D2 — Migrations

Run `npx prisma migrate dev` to create all tables. Verify schema is correct.

### D3 — Seed Exercise Library

Seed the database with:
- Muscle groups: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quadriceps, Hamstrings, Glutes, Calves, Abs, Obliques, Traps, Lats
- Equipment types: Barbell, Dumbbell, Machine, Cable, Bodyweight, Smith Machine, EZ Bar, Kettlebell, Resistance Band
- ~80-100 common exercises across all muscle groups with proper categorization

---

### A1-A5 — API Layer

All APIs built as Next.js Server Actions and/or API routes (`app/api/...`). Each API provides full CRUD plus any specialized queries (e.g., exercise history, filtered lists, workout logs).

---

### E1 — Exercise List Page

**Route:** `/exercises`

- Grid/list view of all exercises
- Filter by muscle group (sidebar or dropdown)
- Filter by equipment type
- Search by name
- Click to open detail

### E2 — Exercise Detail Page

**Route:** `/exercises/[id]`

- Exercise name, muscle group, equipment, description
- AI-generated image (placeholder until E3)
- History section (placeholder until E4)
- Notes section (links to N1)

### E3 — Google Imagen Integration

**⚠️ USER ACTION REQUIRED: Provide Google Imagen API key (Gemini API or Vertex AI credentials)**

Generate exercise images showing:
- The exercise being performed (machine or free weight setup visible)
- Highlighted muscle groups being targeted
- Consistent visual style across all exercises
- Style: clean, modern fitness illustration with anatomical muscle highlighting

Use `imagen-4.0-generate-001` model. Store generated images (local filesystem or cloud storage). Cache to avoid regenerating.

**Imagen prompt template research:**
- Primary style: "Clean digital fitness illustration of [exercise name] showing [equipment] with highlighted [muscle group] muscles in anatomical overlay. Modern, minimal gym background. Studio lighting. Consistent flat illustration style."
- Generate on-demand when exercise is viewed and has no image yet, or via batch job.

### E4 — Exercise History & Analytics

**Route:** `/exercises/[id]` (history tab)

- Line chart: estimated 1RM over time
- Line chart: best set (weight × reps) over time
- Line chart: total volume per session over time
- Table of all past performances with date, sets, reps, weight
- Use Recharts (ShadCN charts) for visualization

---

### P1 — Program List Page

**Route:** `/programs`

- Card grid of all programs
- Show type (Periodized / Simple), number of workouts, creation date
- Create new program button

### P2 — Program Create/Edit Page

**Route:** `/programs/[id]`

- Name, description, type selector (Periodized / Simple)
- **Defaults section:**
  - Default rest between sets (seconds) — slider or number input
  - Default warm-up sets count (e.g., 1)
  - Default working sets count (e.g., 3)
  - Default warm-up weight percentage (e.g., 60%) — slider
- Workout list within the program
- Add/remove/reorder workouts

### P3 — Periodization Support

- Phase management within a periodized program
- Each phase: name, duration (weeks), description
- Assign workouts to phases
- Phase order visualization (timeline or list)
- Logic for cycling through phases based on date/week

### P4 — Simple Program Support

- Day split management (e.g., Day 1: Push, Day 2: Pull, Day 3: Legs)
- Workouts cycle indefinitely
- "Next workout" logic based on last completed

---

### W1 — Workout Create/Edit Page

**Route:** `/workouts/new` or `/programs/[id]/workouts/[id]`

- Workout name
- Add exercises from exercise library (searchable modal)
- Reorder exercises via drag-and-drop

### W2 — Exercise Set Configuration

Within workout edit:
- Per exercise: adjust warm-up sets, working sets (defaults from program)
- Per set: target weight, target reps
- Warm-up set auto-calculates weight from working weight × warm-up percentage
- Quick +/- buttons for set count

### W3 — Workout Detail View

**Route:** `/workouts/[id]`

- Full exercise list with set breakdown (warm-up vs working)
- Target weight/reps per set
- "Start Workout" button → navigates to live session

---

### L1 — Workout Session Page

**Route:** `/workouts/[id]/session`

- Current exercise highlighted
- Timer display (elapsed time since session start)
- Exercise list with completion progress
- Navigate between exercises

### L2 — Set Logging

- Weight input (number, quick +/- 2.5 or 5 buttons)
- Reps input (number, quick +/- 1 buttons)
- Tap/click to mark set complete
- Show previous performance for same exercise as reference
- Keyboard-optimized entry for desktop

### L3 — Rest Timer

- Countdown timer starts when a set is marked complete
- Duration from program default (overridable per exercise)
- Visual + optional audio/browser notification when rest is over
- Skip/extend rest buttons

### L4 — Auto-Start Session

- When user enters first weight/rep data, session `startedAt` is set
- Status changes from PLANNED → IN_PROGRESS
- Timer begins counting

### L5 — Auto-End Session

- Track last user interaction timestamp
- After 30 minutes of no data entry, auto-end the session
- Set `endedAt` and status → COMPLETED
- Use `setInterval` or `requestIdleCallback` + visibility API
- Show confirmation toast or allow undo within a grace period

### L6 — 1RM Calculation

- Epley formula: `1RM = weight × (1 + reps / 30)`
- Brzycki formula: `1RM = weight × (36 / (37 - reps))`
- Display estimated 1RM after each working set
- Track and save personal records automatically

---

### N1 — Exercise Notes UI

- Add note for an exercise during a workout session
- Text area with submit
- Notes are per exercise (not per set), associated with the workout session
- Display recent notes for same exercise from past workouts

### N2 — Pin Notes

- Toggle pin on any note
- Pinned notes appear at the top of the notes list, always visible
- Pinned state persists across sessions

### N3 — Notes History

- Scrollable list of all past notes for a given exercise
- Grouped by workout date
- Search within notes

---

### H1 — Workout History Page

**Route:** `/history`

- List of all completed workout sessions, newest first
- Calendar view toggle (click a date to see that day's workout)
- Summary per session: exercises performed, total sets, total volume, duration
- Click to expand/view full session details

### H2 — Edit Past Workouts

- Open any past workout session
- Edit sets (weight, reps), add/remove sets
- Add/modify notes
- Recalculates any affected personal records

### H3 — Personal Records

- Dedicated section or integrated into exercise detail
- Track: heaviest weight, most reps, highest estimated 1RM
- PR badges/indicators when a new record is set during a live session
- PR history timeline

### H4 — Progress Charts

- Volume over time (total weight lifted per workout/week/month)
- Strength trends (1RM estimates over time per exercise)
- Frequency charts (workouts per week)
- Uses Recharts via ShadCN chart components

---

### AI1 — AI Workout Planning

- Text input: "Generate a push day workout focusing on chest with 5 exercises"
- AI generates a complete workout with exercises, sets, reps, and suggested weights
- User can review, edit, and save the generated workout
- Uses Claude API (or user's preferred LLM)

### AI2 — CLI/API Endpoint for Claude Code

**Route:** `POST /api/workouts/log`

- Accept JSON payload with workout data:
  ```json
  {
    "name": "Push Day",
    "date": "2026-03-20",
    "exercises": [
      {
        "name": "Bench Press",
        "sets": [
          { "weight": 80, "reps": 10, "type": "WORKING" },
          { "weight": 80, "reps": 8, "type": "WORKING" }
        ]
      }
    ]
  }
  ```
- Fuzzy-match exercise names to existing exercises in the library
- Create workout session + all sets in one call
- Return created session ID
- Also: `POST /api/exercises` for adding new exercises
- This enables running Claude Code locally and saying "log this workout" and it hits the local dev server

### AI3 — AI Exercise Population

- Batch generate exercises by muscle group
- AI suggests exercise name, description, primary/secondary muscle groups, equipment
- Review and approve before saving
- Useful for rapidly building out the exercise library

---

### PO1 — Dashboard / Home Page

**Route:** `/` (dashboard)

- Next scheduled workout (from active program)
- Recent workout history (last 5)
- Personal records highlights
- Weekly volume summary
- Quick "Start Workout" action

### PO2 — Responsive Design

- All pages work well at desktop, tablet, and mobile widths
- Workout session page especially optimized for mobile (phone at the gym)
- Touch-friendly set logging inputs
- Collapsible sidebar on small screens

### PO3 — Loading & Error States

- Skeleton loaders for all data-fetching pages
- Error boundaries with retry
- Toast notifications for actions (saved, deleted, PR achieved, etc.)
- Optimistic updates where appropriate

---

## User Actions Required

| When | What |
|------|------|
| Before **E3** | Provide Google Imagen API key (Gemini API key from [Google AI Studio](https://aistudio.google.com/) or Vertex AI credentials) |
| Before **AI1** | Confirm preferred AI provider for workout generation (Claude API key, or use local LLM) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | ShadCN + Tailwind CSS |
| Database | PostgreSQL (local) |
| ORM | Prisma |
| Charts | Recharts (via ShadCN Charts) |
| Image Gen | Google Imagen API |
| AI | Claude API (Anthropic) |
| State | React Server Components + Server Actions |
| Auth | None (local-first, single user for now) |
