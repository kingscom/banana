import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase 클라이언트 생성 함수
export const createClient = () => {
  return createSupabaseClient(supabaseUrl!, supabaseAnonKey!)
}

// 기본 Supabase 클라이언트
export const supabase = createClient()

// Database Types
export interface Document {
  id: string
  user_id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  upload_date: string
  created_at: string
  updated_at: string
}

export interface Highlight {
  id: string
  document_id: string
  user_id: string
  page_number: number
  selected_text: string
  note?: string
  position_x: number
  position_y: number
  position_width: number
  position_height: number
  color?: string // 하이라이트 색상
  created_at: string
}

export interface Note {
  id: string
  document_id: string
  user_id: string
  page_number: number
  content: string
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface Concept {
  id: string
  user_id: string
  name: string
  description: string
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface ConceptConnection {
  id: string
  user_id: string
  from_concept_id: string
  to_concept_id: string
  created_at: string
}

export interface LearningProgress {
  id: string
  user_id: string
  document_id: string
  progress_percentage: number
  last_page_read: number
  reading_time_minutes: number
  created_at: string
  updated_at: string
}

export interface Dashboard {
  id: string
  user_id: string
  title: string
  settings: any
  created_at: string
  updated_at: string
}

// Database operations
export const db = {
  // Documents
  async getDocuments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching documents:', error)
        return []
      }
      return data as Document[]
    } catch (error) {
      console.error('Database error in getDocuments:', error)
      return []
    }
  },

  async createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single()
    
    if (error) throw error
    return data as Document
  },

  async deleteDocument(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Highlights
  async getHighlights(documentId: string) {
    try {
      if (!documentId) return []
      
      const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching highlights:', error)
        return []
      }
      return data as Highlight[]
    } catch (error) {
      console.error('Database error in getHighlights:', error)
      return []
    }
  },

  async createHighlight(highlight: Omit<Highlight, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('highlights')
      .insert([highlight])
      .select()
      .single()
    
    if (error) throw error
    return data as Highlight
  },

  async updateHighlight(id: string, updates: Partial<Highlight>) {
    const { data, error } = await supabase
      .from('highlights')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Highlight
  },

  async deleteHighlight(id: string) {
    const { error } = await supabase
      .from('highlights')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Notes
  async getNotes(documentId: string) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Note[]
  },

  async createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('notes')
      .insert([note])
      .select()
      .single()
    
    if (error) throw error
    return data as Note
  },

  async updateNote(id: string, updates: Partial<Note>) {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Note
  },

  async deleteNote(id: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Concepts
  async getConcepts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching concepts:', error)
        return []
      }
      return data as Concept[]
    } catch (error) {
      console.error('Database error in getConcepts:', error)
      return []
    }
  },

  async createConcept(concept: Omit<Concept, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('concepts')
      .insert([concept])
      .select()
      .single()
    
    if (error) throw error
    return data as Concept
  },

  async updateConcept(id: string, updates: Partial<Concept>) {
    const { data, error } = await supabase
      .from('concepts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Concept
  },

  async deleteConcept(id: string) {
    const { error } = await supabase
      .from('concepts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Concept Connections
  async getConceptConnections(userId: string) {
    try {
      const { data, error } = await supabase
        .from('concept_connections')
        .select('*')
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error fetching concept connections:', error)
        return []
      }
      return data as ConceptConnection[]
    } catch (error) {
      console.error('Database error in getConceptConnections:', error)
      return []
    }
  },

  async createConceptConnection(connection: Omit<ConceptConnection, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('concept_connections')
      .insert([connection])
      .select()
      .single()
    
    if (error) throw error
    return data as ConceptConnection
  },

  async deleteConceptConnection(fromId: string, toId: string) {
    const { error } = await supabase
      .from('concept_connections')
      .delete()
      .eq('from_concept_id', fromId)
      .eq('to_concept_id', toId)
    
    if (error) throw error
  },

  // Learning Progress
  async getLearningProgress(userId: string, documentId?: string) {
    try {
      let query = supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId)
      
      if (documentId) {
        query = query.eq('document_id', documentId)
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching learning progress:', error)
        return []
      }
      return data as LearningProgress[]
    } catch (error) {
      console.error('Database error in getLearningProgress:', error)
      return []
    }
  },

  async updateLearningProgress(progress: Omit<LearningProgress, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('learning_progress')
      .upsert([{
        ...progress,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id,document_id'
      })
      .select()
      .single()
    
    if (error) throw error
    return data as LearningProgress
  },

  // Dashboard functions
  async getUserDashboard(userId: string) {
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching dashboard:', error)
        return null
      }
      return data as Dashboard
    } catch (error) {
      console.error('Database error in getUserDashboard:', error)
      return null
    }
  },

  async updateDashboard(dashboard: Partial<Dashboard> & { user_id: string }) {
    const { data, error } = await supabase
      .from('dashboards')
      .upsert([{
        ...dashboard,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Dashboard
  }
}