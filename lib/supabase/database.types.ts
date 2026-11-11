export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; username: string | null; grade: string | null; primary_subject: string | null; level: string | null; goal: string | null; target_competition_type: string | null; training_intensity: string | null; onboarding_completed_at: string | null; daily_xp_goal: number; target_subject_id: string | null; target_competition_id: string | null; target_date: string | null; goal_set_at: string | null; is_admin: boolean; created_at: string; target_university: string | null; telegram_username: string | null; telegram_chat_id: number | null; telegram_linked_at: string | null; telegram_link_code: string | null; role: string; tour_completed_at: string | null }
        Insert: { id: string; full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; goal_set_at?: string | null; is_admin?: boolean; created_at?: string; target_university?: string | null; telegram_username?: string | null; telegram_chat_id?: number | null; telegram_linked_at?: string | null; telegram_link_code?: string | null; role?: string; tour_completed_at?: string | null }
        Update: { full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; goal_set_at?: string | null; is_admin?: boolean; target_university?: string | null; telegram_username?: string | null; telegram_chat_id?: number | null; telegram_linked_at?: string | null; telegram_link_code?: string | null; tour_completed_at?: string | null; role?: string }
        Relationships: []
      }
      profile_avatars: {
        Row: { user_id: string; webp_base64: string; updated_at: string }
        Insert: { user_id: string; webp_base64: string; updated_at?: string }
        Update: { webp_base64?: string; updated_at?: string }
        Relationships: []
      }
      subjects: {
        Row: { id: string; name: string; slug: string; active: boolean }
        Insert: { id?: string; name: string; slug: string; active?: boolean }
        Update: { name?: string; slug?: string; active?: boolean }
        Relationships: []
      }
      topics: {
        Row: { id: string; subject_id: string; name: string; slug: string; position: number }
        Insert: { id?: string; subject_id: string; name: string; slug: string; position?: number }
        Update: { subject_id?: string; name?: string; slug?: string; position?: number }
        Relationships: []
      }
      tasks: {
        Row: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution: string | null; hints: string[]; source: string | null; estimated_minutes: number | null; given: string[]; find_prompt: string | null; diagram_url: string | null; source_url: string | null; licence: string; attribution: string | null; grade_min: number | null; grade_max: number | null; created_at: string; level: string | null; derived_from: string | null; paper: string | null; class_id: string | null; created_by: string | null; hidden: boolean }
        Insert: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string; level?: string | null; derived_from?: string | null; paper?: string | null; class_id?: string | null; created_by?: string | null; grade_min?: number | null; grade_max?: number | null; hidden?: boolean }
        Update: { subject_id?: string; topic_id?: string; title?: string; problem?: string; difficulty?: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null; level?: string | null; derived_from?: string | null; paper?: string | null; class_id?: string | null; grade_min?: number | null; grade_max?: number | null; hidden?: boolean }
        Relationships: []
      }
      lessons: {
        Row: { id: string; topic_id: string; title: string; summary: string | null; estimated_minutes: number | null; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string; i18n: Json }
        Insert: { id: string; topic_id: string; title: string; summary?: string | null; estimated_minutes?: number | null; position?: number; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { topic_id?: string; title?: string; summary?: string | null; estimated_minutes?: number | null; position?: number; source_url?: string | null; licence?: string; attribution?: string | null }
        Relationships: []
      }
      lesson_blocks: {
        // visual is figure parameters, never markup. lib/figures.ts narrows it
        // before anything is drawn; see the note at the top of that file.
        Row: { id: string; lesson_id: string; kind: 'concept' | 'explanation' | 'example' | 'key_facts'; heading: string | null; body: string | null; items: string[]; position: number; visual_kind: string | null; visual: Json | null; i18n: Json }
        Insert: { id?: string; lesson_id: string; kind: 'concept' | 'explanation' | 'example' | 'key_facts'; heading?: string | null; body?: string | null; items?: string[]; position?: number; visual_kind?: string | null; visual?: Json | null }
        Update: { kind?: 'concept' | 'explanation' | 'example' | 'key_facts'; heading?: string | null; body?: string | null; items?: string[]; position?: number; visual_kind?: string | null; visual?: Json | null }
        Relationships: []
      }
      lesson_views: {
        // The read flag is self-reported. A trigger sets the first completion.
        Row: { id: string; user_id: string; lesson_id: string; opened_at: string; completed_at: string | null; first_completed_at: string | null }
        Insert: { id?: string; user_id: string; lesson_id: string; opened_at?: string; completed_at?: string | null }
        Update: { opened_at?: string; completed_at?: string | null }
        Relationships: []
      }
      quiz_questions: {
        // `correct_index` and `explanation` are the answer key. They are to a
        // quiz what tasks.official_solution is to a task: never selected into
        // anything the browser receives before the student has answered.
        Row: { id: string; topic_id: string; lesson_id: string | null; prompt: string; options: string[]; correct_index: number; explanation: string; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string; i18n: Json }
        Insert: { id: string; topic_id: string; lesson_id?: string | null; prompt: string; options: string[]; correct_index: number; explanation: string; position?: number; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { topic_id?: string; lesson_id?: string | null; prompt?: string; options?: string[]; correct_index?: number; explanation?: string; position?: number; source_url?: string | null; licence?: string; attribution?: string | null }
        Relationships: []
      }
      quiz_attempts: {
        // Writable only through the service-role client: marking happens on the
        // server, so is_correct is never a value the browser chose.
        Row: { id: string; user_id: string; question_id: string; chosen_index: number; is_correct: boolean; created_at: string; preparation_session_id: string | null }
        Insert: { id?: string; user_id: string; question_id: string; chosen_index: number; is_correct: boolean; created_at?: string; preparation_session_id?: string | null }
        Update: never
        Relationships: []
      }
      flashcards: {
        // user_id null is a shared card; set, it is private to that student and
        // only they can read or write it.
        Row: { id: string; topic_id: string; user_id: string | null; front: string; back: string; position: number; source_url: string | null; licence: string; attribution: string | null; created_at: string; i18n: Json }
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
      task_reports: {
        // Written only through the service-role client; students read their own.
        Row: { id: string; user_id: string; task_id: string; attempt_id: string | null; kind: string; message: string; status: string; resolution: string | null; created_at: string; resolved_at: string | null }
        Insert: { id?: string; user_id: string; task_id: string; attempt_id?: string | null; kind: string; message: string; status?: string; resolution?: string | null; created_at?: string; resolved_at?: string | null }
        Update: { status?: string; resolution?: string | null; resolved_at?: string | null }
        Relationships: []
      }
      task_attempts: {
        // Writable only through the service-role client in lib/supabase/admin.ts:
        // RLS grants `authenticated` select but no insert, update or delete.
        Row: { id: string; user_id: string; task_id: string; answer: string; is_correct: boolean; score: number; feedback: string | null; graded_by: string; model: string | null; mock_test_id: string | null; source: string; points: number | null; summary: string | null; marks: unknown; criteria: unknown; break_point: unknown; created_at: string }
        Insert: { id?: string; user_id: string; task_id: string; answer: string; is_correct?: boolean; score?: number; feedback?: string | null; graded_by?: string; model?: string | null; mock_test_id?: string | null; source?: string; points?: number | null; summary?: string | null; marks?: unknown; criteria?: unknown; break_point?: unknown; created_at?: string }
        Update: { feedback?: string | null; score?: number; is_correct?: boolean; graded_by?: string }
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
        Row: { id: string; user_id: string; title: string; subject_id: string | null; task_id: string | null; created_at: string }
        Insert: { id?: string; user_id: string; title?: string; subject_id?: string | null; task_id?: string | null; created_at?: string }
        Update: { title?: string; subject_id?: string | null }
        Relationships: []
      }
      chat_messages: {
        Row: { id: string; session_id: string; role: string; content: string; created_at: string; meta: Json | null }
        Insert: { id?: string; session_id: string; role: string; content: string; created_at?: string; meta?: Json | null }
        Update: { role?: string; content?: string; meta?: Json | null }
        Relationships: []
      }
      competitions: {
        Row: { id: string; name: string; slug: string | null; subject_id: string | null; level: string | null; starts_on: string | null; ends_on: string | null; registration_url: string | null; registration_deadline: string | null; created_by: string | null; created_at: string; region: string | null; founded: number | null; official_url: string | null; papers_url: string | null; active: boolean; sources: Json; reviewed_on: string | null }
        Insert: { id?: string; name: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null; created_by?: string | null; created_at?: string; region?: string | null; founded?: number | null; official_url?: string | null; papers_url?: string | null; active?: boolean; sources?: Json; reviewed_on?: string | null }
        Update: { name?: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null; region?: string | null; founded?: number | null; official_url?: string | null; papers_url?: string | null; active?: boolean; sources?: Json; reviewed_on?: string | null }
        Relationships: []
      }
      resources: {
        Row: { id: string; task_id: string | null; topic_id: string | null; kind: string; title: string; url: string; description: string | null; licence: string; attribution: string | null; position: number; created_at: string }
        Insert: { id?: string; task_id?: string | null; topic_id?: string | null; kind: string; title: string; url: string; description?: string | null; licence?: string; attribution?: string | null; position?: number; created_at?: string }
        Update: { kind?: string; title?: string; url?: string; description?: string | null; licence?: string; attribution?: string | null; position?: number }
        Relationships: []
      }
      task_drafts: {
        Row: { user_id: string; task_id: string; body: string; updated_at: string }
        Insert: { user_id: string; task_id: string; body: string; updated_at?: string }
        Update: { body?: string; updated_at?: string }
        Relationships: []
      }
      saved_tasks: {
        Row: { user_id: string; task_id: string; created_at: string }
        Insert: { user_id: string; task_id: string; created_at?: string }
        Update: { created_at?: string }
        Relationships: []
      }
      preparation_preferences: {
        Row: { user_id: string; weekdays: number[]; session_minutes: number; school_grade: number | null; daily_tasks: number }
        Insert: { user_id: string; weekdays: number[]; session_minutes: number; school_grade?: number | null; daily_tasks?: number }
        Update: { weekdays?: number[]; session_minutes?: number; school_grade?: number | null; daily_tasks?: number }
        Relationships: []
      }
      mock_tests: {
        // Written only through the service-role client: a client that could
        // compose its own paper could compose an easy one.
        Row: { id: string; user_id: string; subject_id: string; task_ids: string[]; duration_minutes: number; started_at: string; submitted_at: string | null; score_percent: number | null; level: string | null; created_at: string; preparation_key: string | null; preparation_reviewed_at: string | null; submitted_late: boolean; level_applied: boolean }
        Insert: { id?: string; user_id: string; subject_id: string; task_ids: string[]; duration_minutes: number; started_at?: string; submitted_at?: string | null; score_percent?: number | null; level?: string | null; preparation_key?: string | null; preparation_reviewed_at?: string | null }
        Update: { submitted_at?: string | null; score_percent?: number | null; level?: string | null; preparation_key?: string | null; preparation_reviewed_at?: string | null; submitted_late?: boolean; level_applied?: boolean }
        Relationships: []
      }
      competition_registrations: {
        Row: { user_id: string; competition_id: string; created_at: string }
        Insert: { user_id: string; competition_id: string; created_at?: string }
        Update: { created_at?: string }
        Relationships: []
      }
      day_states: {
        // The student's own report of their own day. Nobody else reads it.
        Row: { id: string; user_id: string; on_date: string; theory_minutes: number; solving_minutes: number; mental: number; sleep_hours: number; lights_out: boolean; load_minutes: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; on_date: string; theory_minutes?: number; solving_minutes?: number; mental?: number; sleep_hours?: number; lights_out?: boolean; load_minutes?: number; updated_at?: string }
        Update: { theory_minutes?: number; solving_minutes?: number; mental?: number; sleep_hours?: number; lights_out?: boolean; load_minutes?: number; updated_at?: string }
        Relationships: []
      }
      competition_details: {
        // The write-up of an olympiad, one row per language.
        Row: { competition_id: string; locale: string; summary: string; format: string | null; route: string | null; eligibility: string | null }
        Insert: { competition_id: string; locale: string; summary: string; format?: string | null; route?: string | null; eligibility?: string | null }
        Update: { summary?: string; format?: string | null; route?: string | null; eligibility?: string | null }
        Relationships: []
      }
      classes: {
        // join_code defaults to public.gen_join_code(): six unambiguous characters.
        Row: { id: string; teacher_id: string; name: string; subject_id: string | null; join_code: string; created_at: string }
        Insert: { id?: string; teacher_id: string; name: string; subject_id?: string | null; join_code?: string; created_at?: string }
        Update: { name?: string; subject_id?: string | null; join_code?: string }
        Relationships: []
      }
      class_members: {
        // Inserted only through the service-role client, after the join code is checked.
        Row: { class_id: string; student_id: string; joined_at: string }
        Insert: { class_id: string; student_id: string; joined_at?: string }
        Update: { joined_at?: string }
        Relationships: []
      }
      class_tracks: {
        // A teacher's order and targets for one class; a missing row is the default.
        Row: { class_id: string; topic_id: string; position: number; target: number | null; skipped: boolean; due_date: string | null; note: string | null; updated_at: string }
        Insert: { class_id: string; topic_id: string; position: number; target?: number | null; skipped?: boolean; due_date?: string | null; note?: string | null; updated_at?: string }
        Update: { position?: number; target?: number | null; skipped?: boolean; due_date?: string | null; note?: string | null; updated_at?: string }
        Relationships: []
      }
      class_track_tasks: {
        // The problems a teacher chose for a section, written through save_class_plan.
        Row: { class_id: string; topic_id: string; task_id: string; position: number }
        Insert: { class_id: string; topic_id: string; task_id: string; position: number }
        Update: { position?: number }
        Relationships: []
      }
      class_files: {
        // A class's handouts. The bytes are on disk (lib/class-files.ts).
        Row: { id: string; class_id: string; path: string; name: string; size: number; mime: string; uploaded_by: string | null; created_at: string }
        Insert: { id?: string; class_id: string; path: string; name: string; size: number; mime: string; uploaded_by?: string | null; created_at?: string }
        Update: { name?: string }
        Relationships: []
      }
      telegram_sessions: {
        // The half-asked check-in, written only by the webhook with the service role.
        Row: { chat_id: number; user_id: string; step: number; answers: Json; updated_at: string }
        Insert: { chat_id: number; user_id: string; step?: number; answers?: Json; updated_at?: string }
        Update: { user_id?: string; step?: number; answers?: Json; updated_at?: string }
        Relationships: []
      }
      daily_visits: {
        // One row per calendar day (the student's own) the app was opened.
        Row: { user_id: string; day: string; created_at: string }
        Insert: { user_id: string; day: string; created_at?: string }
        Update: { day?: string }
        Relationships: []
      }
      admin_log: {
        // Every change made from the admin panel. Service role only.
        Row: { id: number; admin_id: string | null; action: string; target: string | null; detail: Json; created_at: string }
        Insert: { admin_id?: string | null; action: string; target?: string | null; detail?: Json; created_at?: string }
        Update: { detail?: Json }
        Relationships: []
      }
      site_settings: {
        Row: { key: string; value: Json; updated_at: string; updated_by: string | null }
        Insert: { key: string; value: Json; updated_at?: string; updated_by?: string | null }
        Update: { value?: Json; updated_at?: string; updated_by?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      study_days: {
        Args: { since: string }
        Returns: { day: string }[]
      }
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
