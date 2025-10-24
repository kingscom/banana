import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; fileName: string } }
) {
  try {
    const { userId, fileName } = params
    
    if (!userId || !fileName) {
      return NextResponse.json(
        { error: 'userId and fileName are required' },
        { status: 400 }
      )
    }

    const filePath = path.join(process.cwd(), 'uploads', userId, fileName)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // MIME 타입 결정
      const ext = path.extname(fileName).toLowerCase()
      let contentType = 'application/octet-stream'
      
      if (ext === '.pdf') {
        contentType = 'application/pdf'
      } else if (ext === '.txt') {
        contentType = 'text/plain'
      } else if (ext === '.json') {
        contentType = 'application/json'
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
        },
      })
    } catch (fileError) {
      console.error('File read error:', fileError)
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}