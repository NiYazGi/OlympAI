export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; username: string | null; grade: string | null; primary_subject: string | null; level: string | null; goal: string | null; target_competition_type: string | null; training_intensity: string | null; onboarding_completed_at: string | null; daily_xp_goal: number; target_subject_id: string | null; target_competition_id: string | null; target_date: string | null; target_university: string | null; telegram_username: string | null; telegram_chat_id: number | null; telegram_linked_at: string | null; telegram_link_code: string | null; is_admin: boolean; role: 'student' | 'teacher'; tour_completed_at: string | null; created_at: string }
        Insert: { id: string; full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; target_university?: string | null; telegram_username?: string | null; telegram_chat_id?: number | null; telegram_linked_at?: string | null; telegram_link_code?: string | null; is_admin?: boolean; role?: 'student' | 'teacher'; tour_completed_at?: string | null; created_at?: string }
        Update: { full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; target_university?: string | null; telegram_username?: string | null; telegram_chat_id?: number | null; telegram_linked_at?: string | null; telegram_link_code?: string | null; is_admin?: boolean; role?: 'student' | 'teacher'; tour_completed_at?: string | null }
        Relationships: []
      }
      subjects: {
        // `active` hides a subject from every read without deleting anything.
        Row: { id: string; name: string; slug: string; active: boolean }
        Insert: { id?: string; name: string; slug: string; active?: boolean }
        Update: { name?: string; slug?: string; active?: boolean }
        Relationships: []
      }
      topics: {
        // position is the syllabus order — see migration 44. A class may
        // replace it in class_tracks.
        Row: { id: string; subject_id: string; name: string; slug: string; position: number }
        Insert: { id?: string; subject_id: string; name: string; slug: string; position?: number }
        Update: { subject_id?: string; name?: string; slug?: string; position?: number }
        Relationships: []
      }
      tasks: {
        Row: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution: string | null; hints: string[]; source: string | null; estimated_minutes: number | null; given: string[]; find_prompt: string | null; diagram_url: string | null; source_url: string | null; licence: string; attribution: string | null; level: string | null; derived_from: string | null; paper: string | null; class_id: string | null; created_by: string | null; created_at: string }
        Insert: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null; level?: string | null; derived_from?: string | null; paper?: string | null; class_id?: string | null; created_by?: string | null; created_at?: string }
        Update: { subject_id?: string; topic_id?: string; title?: string; problem?: string; difficulty?: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null; level?: string | null; derived_from?: string | null; paper?: string | null; class_id?: string | null }
        Relationships: []
      }
      lessons: {
        Row: { id: string; topic_id: string; title: string; summary: string | null; estimated_minutes: number | null; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string }
        Insert: { id: string; topic_id: string; title: string; summary?: string | null; estimated_minutes?: number | null; position?: number; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { topic_id?: string; title?: string; summary?: string | null; estimated_minutes?: number | null; position?: number; source_url?: string | null; licence?: string; attribution?: string | null }
        Relationships: []
      }
      lesson_blocks: {
        // visual is figure parameters, never markup. lib/figures.ts narrows it
        // before anything is drawn; see the note at the top of that file.
        Row: { id: string; lesson_id: string; kind: 'concept' | 'explanation' | 'example' | 'key_facts'; heading: string | null; body: string | null; items: string[]; position: number; visual_kind: string | null; visual: Json | null }
        Insert: { id?: string; lesson_id: string; kind: 'concept' | 'explanation' | 'example' | 'key_facts'; heading?: string | null; body?: string | null; items?: string[]; position?: number; visual_kind?: string | null; visual?: Json | null }
        Update: { kind?: 'concept' | 'explanation' | 'example' | 'key_facts'; heading?: string | null; body?: string | null; items?: string[]; position?: number; visual_kind?: string | null; visual?: Json | null }
        Relationships: []
      }
      lesson_views: {
        // The student's own claim about their own reading. Pays nothing and
        // unlocks nothing, so RLS lets them write it directly.
        Row: { id: string; user_id: string; lesson_id: string; opened_at: string; completed_at: string | null }
        Insert: { id?: string; user_id: string; lesson_id: string; opened_at?: string; completed_at?: string | null }
        Update: { opened_at?: string; completed_at?: string | null }
        Relationships: []
      }
      day_states: {
        // The student's own report of their own day, like lesson_views: no
        // artefact proves a night's sleep. Pays no XP and unlocks nothing, so
        // RLS lets them write it directly.
        Row: { id: string; user_id: string; on_date: string; theory_minutes: number; solving_minutes: number; mental: number; sleep_hours: number; lights_out: boolean; load_minutes: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; on_date: string; theory_minutes?: number; solving_minutes?: number; mental?: number; sleep_hours?: number; lights_out?: boolean; load_minutes?: number; updated_at?: string }
        Update: { theory_minutes?: number; solving_minutes?: number; mental?: number; sleep_hours?: number; lights_out?: boolean; load_minutes?: number; updated_at?: string }
        Relationships: []
      }
      quiz_questions: {
        // `correct_index` and `explanation` are the answer key. They are to a
        // quiz what tasks.official_solution is to a task: never selected into
        // anything the browser receives before the student has answered.
        Row: { id: string; topic_id: string; lesson_id: string | null; prompt: string; options: string[]; correct_index: number; explanation: string; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string }
        Insert: { id: string; topic_id: string; lesson_id?: string | null; prompt: string; options: string[]; correct_index: number; explanation: string; position?: number; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { topic_id?: string; lesson_id?: string | null; prompt?: string; options?: string[]; correct_index?: number; explanation?: string; position?: number; source_url?: string | null; licence?: string; attribution?: string | null }
        Relationships: []
      }
      quiz_attempts: {
        // Writable only through the service-role client: marking happens on the
        // server, so is_correct is never a value the browser chose.
        Row: { id: string; user_id: string; question_id: string; chosen_index: number; is_correct: boolean; created_at: string }
        Insert: { id?: string; user_id: string; question_id: string; chosen_index: number; is_correct: boolean; created_at?: string }
        Update: never
        Relationships: []
      }
      flashcards: {
        // user_id null is a shared card; set, it is private to that student and
        // only they can read or write it.
        Row: { id: string; topic_id: string; user_id: string | null; front: string; back: string; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string }
        Insert: { id?: string; topic_id: string; user_id?: string | null; front: string; back: string; position?: number; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { front?: string; back?: string; position?: number }
        Relationships: []
      }
      flashcard_reviews: {
        Row: { id: string; user_id: string; card_id: string; rating: number; created_at: string }
        Insert: { id?: string; user_id: string; card_id: string; rating: number; created_at?: string }
        Update: never
        Relationships: []
      }
      task_attempts: {
        // Writable only through the service-role client in lib/supabase/admin.ts:
        // RLS grants `authenticated` select but no insert, update or delete.
        // points, summary, marks, criteria and break_point are the grader's
        // protocol (migration 54); attempts graded before it have them null.
        Row: { id: string; user_id: string; task_id: string; answer: string; is_correct: boolean; score: number; feedback: string | null; graded_by: string; model: string | null; mock_test_id: string | null; source: string; created_at: string; points: number | null; summary: string | null; marks: Json | null; criteria: Json | null; break_point: Json | null }
        Insert: { id?: string; user_id: string; task_id: string; answer: string; is_correct?: boolean; score?: number; feedback?: string | null; graded_by?: string; model?: string | null; mock_test_id?: string | null; source?: string; created_at?: string; points?: number | null; summary?: string | null; marks?: Json | null; criteria?: Json | null; break_point?: Json | null }
        Update: { feedback?: string | null }
        Relationships: []
      }
      user_progress: {
        // Derived state: written only by the record_task_attempt_progress trigger.
        // RLS grants `authenticated` select and nothing else.
        Row: { id: string; user_id: string; subject_id: string; topic_id: string; solved_count: number; correct_count: number; mastery_score: number; updated_at: string }
        Insert: { user_id: string; subject_id: string; topic_id: string; solved_count?: number; correct_count?: number; mastery_score?: number }
        Update: { solved_count?: number; correct_count?: number; mastery_score?: number }
        Relationships: []
      }
      chat_sessions: {
        Row: { id: string; user_id: string; title: string; subject_id: string | null; created_at: string }
        Insert: { id?: string; user_id: string; title?: string; subject_id?: string | null; created_at?: string }
        Update: { title?: string; subject_id?: string | null }
        Relationships: []
      }
      chat_messages: {
        Row: { id: string; session_id: string; role: string; content: string; created_at: string }
        Insert: { id?: string; session_id: string; role: string; content: string; created_at?: string }
        Update: { role?: string; content?: string }
        Relationships: []
      }
      competitions: {
        Row: { id: string; name: string; slug: string | null; subject_id: string | null; level: string | null; starts_on: string | null; ends_on: string | null; registration_url: string | null; registration_deadline: string | null; region: string | null; founded: number | null; official_url: string | null; papers_url: string | null; active: boolean; created_by: string | null; created_at: string }
        Insert: { id?: string; name: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null; region?: string | null; founded?: number | null; official_url?: string | null; papers_url?: string | null; active?: boolean; created_by?: string | null; created_at?: string }
        Update: { name?: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null; region?: string | null; founded?: number | null; official_url?: string | null; papers_url?: string | null; active?: boolean }
        Relationships: []
      }
      competition_details: {
        // The write-up, one row per language. Read-only from the client: it
        // arrives by migration, like every other piece of reference content.
        Row: { competition_id: string; locale: string; summary: string; format: string | null; route: string | null; eligibility: string | null }
        Insert: { competition_id: string; locale: string; summary: string; format?: string | null; route?: string | null; eligibility?: string | null }
        Update: { summary?: string; format?: string | null; route?: string | null; eligibility?: string | null }
        Relationships: []
      }
      resources: {
        Row: { id: string; task_id: string | null; topic_id: string | null; kind: string; title: string; url: string; description: string | null; licence: string; attribution: string | null; position: number; created_at: string }
        Insert: { id?: string; task_id?: string | null; topic_id?: string | null; kind: string; title: string; url: string; description?: string | null; licence?: string; attribution?: string | null; position?: number }
        Update: { kind?: string; title?: string; url?: string; description?: string | null; licence?: string; attribution?: string | null; position?: number }
        Relationships: []
      }
      mock_tests: {
        // Written only through the service-role client: a client that could
        // compose its own paper could compose an easy one.
        Row: { id: string; user_id: string; subject_id: string; task_ids: string[]; duration_minutes: number; started_at: string; submitted_at: string | null; score_percent: number | null; level: string | null; created_at: string }
        Insert: { id?: string; user_id: string; subject_id: string; task_ids: string[]; duration_minutes: number; started_at?: string; submitted_at?: string | null; score_percent?: number | null; level?: string | null }
        Update: { submitted_at?: string | null; score_percent?: number | null; level?: string | null }
        Relationships: []
      }
      classes: {
        // join_code defaults to public.gen_join_code() — six unambiguous
        // characters. Insert never sets it; rotating one is an update to null
        // and back is not a thing, so the action writes a fresh code instead.
        Row: { id: string; teacher_id: string; name: string; subject_id: string | null; join_code: string; created_at: string }
        Insert: { id?: string; teacher_id: string; name: string; subject_id?: string | null; join_code?: string; created_at?: string }
        Update: { name?: string; subject_id?: string | null; join_code?: string }
        Relationships: []
      }
      telegram_sessions: {
        // The half-asked check-in. Written only by the webhook, with the
        // service role: a row keyed by a Telegram chat id is not something a
        // browser session can be trusted about. See migration 45.
        Row: { chat_id: number; user_id: string; step: number; answers: Json; updated_at: string }
        Insert: { chat_id: number; user_id: string; step?: number; answers?: Json; updated_at?: string }
        Update: { user_id?: string; step?: number; answers?: Json; updated_at?: string }
        Relationships: []
      }
      class_tracks: {
        // The teacher's order for one class, and how many problems each topic
        // asks for. A missing row means the subject's default.
        // Since migration 48 also whether the class skips the topic, when the
        // teacher wants it done, and a note for the students.
        Row: { class_id: string; topic_id: string; position: number; target: number | null; skipped: boolean; due_date: string | null; note: string | null; updated_at: string }
        Insert: { class_id: string; topic_id: string; position: number; target?: number | null; skipped?: boolean; due_date?: string | null; note?: string | null; updated_at?: string }
        Update: { position?: number; target?: number | null; skipped?: boolean; due_date?: string | null; note?: string | null; updated_at?: string }
        Relationships: []
      }
      daily_visits: {
        // One row per calendar day (the student's own) the app was opened.
        Row: { user_id: string; day: string; created_at: string }
        Insert: { user_id: string; day: string; created_at?: string }
        Update: { day?: string }
        Relationships: []
      }
      class_files: {
        // A class's handouts. The bytes are in the private `class-files`
        // bucket; this row is what decides who may get a signed link.
        Row: { id: string; class_id: string; path: string; name: string; size: number; mime: string; uploaded_by: string | null; created_at: string }
        Insert: { id?: string; class_id: string; path: string; name: string; size: number; mime: string; uploaded_by?: string | null; created_at?: string }
        Update: { name?: string }
        Relationships: []
      }
      class_track_tasks: {
        // The problems a teacher chose for a topic, in their order. Written only
        // through save_class_plan, together with class_tracks.
        Row: { class_id: string; topic_id: string; task_id: string; position: number }
        Insert: { class_id: string; topic_id: string; task_id: string; position: number }
        Update: { position?: number }
        Relationships: []
      }
      class_members: {
        // Inserted only through the service-role client, after the join code
        // has been checked. See the note in migration 43.
        Row: { class_id: string; student_id: string; joined_at: string }
        Insert: { class_id: string; student_id: string; joined_at?: string }
        Update: { joined_at?: string }
        Relationships: []
      }
      competition_registrations: {
        Row: { user_id: string; competition_id: string; created_at: string }
        Insert: { user_id: string; competition_id: string; created_at?: string }
        Update: { created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      visit_streak: {
        Args: { today: string }
        Returns: { current_streak: number; best_streak: number; last_day: string | null }[]
      }
      save_class_plan: {
        Args: { plan_class: string; sections: Json; chosen: Json }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
