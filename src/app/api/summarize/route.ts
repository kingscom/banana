import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(request: NextRequest) {
  try {
    const { text, type = 'summary' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      )
    }

    let prompt = ''
    
    if (type === 'summary') {
      prompt = `다음 텍스트를 한국어로 요약해주세요. 주요 포인트를 bullets로 정리하고, 핵심 개념들을 강조해주세요:

${text}

요약:
`
    } else if (type === 'question') {
      prompt = `다음 텍스트를 바탕으로 질문에 답해주세요:

텍스트: ${text}

질문에 대한 답변을 한국어로 제공해주세요.
`
    }

    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specialized in document analysis and educational content. Always respond in Korean.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
      temperature: 0.7,
    })

    const result = completion.choices[0]?.message?.content || ''

    return NextResponse.json({
      result,
      type,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI API Error:', error)
    
    // OpenAI API가 없는 경우 시뮬레이션 응답
    if (error instanceof Error && error.message.includes('API key')) {
      const { text, type = 'summary' } = await request.json()
      
      let simulatedResponse = ''
      
      if (type === 'summary') {
        simulatedResponse = `📄 **문서 요약**

**주요 내용:**
• 이 문서는 AI 기반 학습 플랫폼에 대한 내용을 담고 있습니다
• PDF 문서 처리 및 분석 기능을 제공합니다
• React와 Node.js를 활용한 통합 플랫폼 구축을 다룹니다
• 사용자 인증은 Google OAuth를 통해 구현됩니다

**핵심 개념:**
• AI 요약 및 질의응답 시스템
• 하이라이트 및 노트 기능
• 개념 연결맵을 통한 지식 시각화
• 맞춤형 강의 추천 시스템

*참고: OpenAI API 키가 설정되지 않아 시뮬레이션 응답을 제공합니다.*`
      } else {
        simulatedResponse = `질문에 대한 답변을 제공하기 위해서는 OpenAI API 키가 필요합니다. 

환경 변수에 OPENAI_API_KEY를 설정해주세요.

현재는 시뮬레이션 모드로 동작하고 있습니다.`
      }

      return NextResponse.json({
        result: simulatedResponse,
        type,
        timestamp: new Date().toISOString(),
        simulation: true
      })
    }

    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}