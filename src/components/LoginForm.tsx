'use client'

import { useAuth } from './AuthProvider'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'

export default function LoginForm() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Moving Background */}
      <div className="moving-background"></div>
      
      {/* Overlay */}
      <div className="overlay">
        <div className="content">
          <h1 className="main-title">나만의 AI 스터디룸</h1>
          <p className="subtitle">"AI와 함께 지혜를 쌓아보세요"</p>
          
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="enter-btn"
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>입장 중...</span>
              </>
            ) : (
              <>
                <LogIn className="btn-icon" />
                <span>입장하기</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* 전체 페이지 기본 설정 */
        .login-container {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        /* 움직이는 배경 설정 */
        .moving-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 110%;
          height: 110%;
          background: url('https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1920&q=80')
              no-repeat center center/cover;
          animation: bgMove 10s ease-in-out infinite alternate;
          transform-origin: center center;
        }

        /* 배경에 부드러운 움직임 */
        @keyframes bgMove {
          0% { 
            transform: translateY(-5%) scale(1.1);
            background-position: center 20%;
          }
          100% { 
            transform: translateY(5%) scale(1.1);
            background-position: center 80%;
          }
        }

        /* 반투명 오버레이로 어두운 느낌 추가 */
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        /* 중앙 텍스트와 버튼 */
        .content {
          color: #ffd000ff;
          animation: fadeIn 2s ease;
        }

        .main-title {
          font-size: 2.5em;
          margin-bottom: 0.3em;
          font-family: 'Noto Sans KR', 'Playfair Display', serif;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .subtitle {
          font-size: 1.2em;
          margin-bottom: 1.5em;
          opacity: 0.9;
          font-family: 'Noto Sans KR', sans-serif;
          line-height: 1.6;
        }

        /* 입장 버튼 스타일 */
        .enter-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8em 2em;
          background-color: #d4a373;
          color: #fff;
          border: none;
          border-radius: 25px;
          font-weight: bold;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(212, 163, 115, 0.3);
        }

        .enter-btn:hover {
          background-color: #b5835a;
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(212, 163, 115, 0.5);
        }

        .enter-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 1.2rem;
          height: 1.2rem;
        }

        .loading-spinner {
          width: 1.2rem;
          height: 1.2rem;
          border: 2px solid #fff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 부드러운 등장 애니메이션 */
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .main-title {
            font-size: 2em;
          }
          
          .subtitle {
            font-size: 1rem;
            padding: 0 1rem;
          }
          
          .enter-btn {
            padding: 0.7em 1.5em;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  )
}