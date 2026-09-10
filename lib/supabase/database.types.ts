export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; username: string | null; grade: string | null; primary_subject: string | null; level: string | null; goal: string | null; target_competition_type: string | null; training_intensity: string | null; onboarding_completed_at: string | null; daily_xp_goal: number; target_subject_id: string | null; target_competition_id: string | null; target_date: string | null; is_admin: boolean; created_at: string }
        Insert: { id: string; full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; is_admin?: boolean; created_at?: string }
        Update: { full_name?: string | null; username?: string | null; grade?: string | null; primary_subject?: string | null; level?: string | null; goal?: string | null; target_competition_type?: string | null; training_intensity?: string | null; onboarding_completed_at?: string | null; daily_xp_goal?: number; target_subject_id?: string | null; target_competition_id?: string | null; target_date?: string | null; is_admin?: boolean }
        Relationships: []
      }
      subjects: {
        Row: { id: string; name: string; slug: string }
        Insert: { id?: string; name: string; slug: string }
        Update: { name?: string; slug?: string }
        Relationships: []
      }
      topics: {
        Row: { id: string; subject_id: string; name: string; slug: string }
        Insert: { id?: string; subject_id: string; name: string; slug: string }
        Update: { subject_id?: string; name?: string; slug?: string }
        Relationships: []
      }
      tasks: {
        Row: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution: string | null; hints: string[]; source: string | null; estimated_minutes: number | null; given: string[]; find_prompt: string | null; diagram_url: string | null; source_url: string | null; licence: string; attribution: string | null; created_at: string }
        Insert: { id: string; subject_id: string; topic_id: string; title: string; problem: string; difficulty: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null; created_at?: string }
        Update: { subject_id?: string; topic_id?: string; title?: string; problem?: string; difficulty?: number; official_solution?: string | null; hints?: string[]; source?: string | null; estimated_minutes?: number | null; given?: string[]; find_prompt?: string | null; diagram_url?: string | null; source_url?: string | null; licence?: string; attribution?: string | null }
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
        Row: { id: string; user_id: string; task_id: string; answer: string; is_correct: boolean; score: number; feedback: string | null; graded_by: string; model: string | null; mock_test_id: string | null; source: string; created_at: string }
        Insert: { id?: string; user_id: string; task_id: string; answer: string; is_correct?: boolean; score?: number; feedback?: string | null; graded_by?: string; model?: string | null; mock_test_id?: string | null; source?: string; created_at?: string }
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
        Row: { id: string; name: string; slug: string | null; subject_id: string | null; level: string | null; starts_on: string | null; ends_on: string | null; registration_url: string | null; registration_deadline: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; name: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null; created_by?: string | null; created_at?: string }
        Update: { name?: string; slug?: string | null; subject_id?: string | null; level?: string | null; starts_on?: string | null; ends_on?: string | null; registration_url?: string | null; registration_deadline?: string | null }
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
      competition_registrations: {
        Row: { user_id: string; competition_id: string; created_at: string }
        Insert: { user_id: string; competition_id: string; created_at?: string }
        Update: { created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
