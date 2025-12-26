import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Session } from '@supabase/supabase-js'

type Attached = {
  file: File
  id: string
}

type StoredFile = {
  id: string
  original_filename: string
  file_size: number
  file_type: string
  created_at: string
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const [items, setItems] = useState<Attached[]>([])
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Use environment variable for API URL, fallback to localhost for development
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchFiles = useCallback(async () => {
    if (!session) return
    try {
      const response = await fetch(`${API_URL}/api/files`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch files')
      const data = await response.json()
      setStoredFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      fetchFiles()
    }
  }, [session, fetchFiles])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setItems([])
    setStoredFiles([])
    setMessage('')
  }

  const accept = useMemo(
    () =>
      [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ].join(','),
    []
  )

  const onFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: Attached[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i)
      if (!f) continue
      next.push({ file: f, id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}` })
    }
    setItems((prev) => [...prev, ...next])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    onFiles(e.dataTransfer.files)
  }, [onFiles])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragActive(false)
    }, [])

  const handleUpload = async () => {
    if (!session) return
    setUploading(true)
    setMessage('')
    
    try {
      for (const item of items) {
        const formData = new FormData()
        formData.append('file', item.file)

        const response = await fetch(`${API_URL}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Upload failed')
        }
      }
      setMessage('All files uploaded successfully!')
      setItems([])
      fetchFiles()
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    if (!session) return
    try {
      const response = await fetch(`${API_URL}/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!response.ok) throw new Error('Download failed')
      
      const { downloadUrl } = await response.json()
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName // This might be ignored by some browsers for cross-origin but good to try
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error: any) {
      setMessage(`Download failed: ${error.message}`)
    }
  }

  if (!session) {
    return (
      <div className="page">
        <div className="card">
          <h1 className="title">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
          <form onSubmit={handleAuth} className="auth-form">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
          {message && <p className="message">{message}</p>}
          <button 
            type="button" 
            className="link-btn"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="title">Attach Your Files</h1>
          <button onClick={handleSignOut} className="text-btn">Sign Out</button>
        </div>
        <p className="subtitle">PDF, DOC, DOCX, TXT. Multiple files supported.</p>

        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          aria-label="Drop files here"
        >
          <div className="dropzone-content">
            <span className="dropzone-icon">📎</span>
            <div className="dropzone-text">
              <p>Drag and drop files here</p>
              <p className="or">or</p>
              <button
                className="browse"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Browse files
              </button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden-input"
            onChange={(e) => onFiles(e.target.files)}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {items.length > 0 && (
          <div className="list">
            <div className="list-header">
              <span>Selected Files</span>
              <button className="clear" type="button" onClick={clearAll}>
                Clear all
              </button>
            </div>
            <ul>
              {items.map((x) => (
                <li key={x.id} className="list-item">
                  <div className="file-info">
                    <span className="file-name">{x.file.name}</span>
                    <span className="file-meta">
                      {x.file.type || 'unknown'} • {formatBytes(x.file.size)}
                    </span>
                  </div>
                  <button
                    className="remove"
                    type="button"
                    onClick={() => removeItem(x.id)}
                    aria-label={`Remove ${x.file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {storedFiles.length > 0 && (
          <div className="list" style={{ marginTop: '24px' }}>
            <div className="list-header">
              <span>My Files</span>
            </div>
            <ul>
              {storedFiles.map((x) => (
                <li key={x.id} className="list-item">
                  <div className="file-info">
                    <span className="file-name">{x.original_filename}</span>
                    <span className="file-meta">
                      {x.file_type || 'unknown'} • {formatBytes(x.file_size)} • {new Date(x.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="browse"
                    type="button"
                    onClick={() => handleDownload(x.id, x.original_filename)}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message && <p className={`message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>}

        <div className="actions">
          <button
            className="primary"
            type="button"
            disabled={items.length === 0 || uploading}
            onClick={handleUpload}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  )
}

