import fs from 'fs/promises'
import path from 'path'

/**
 * 임시 디렉토리를 생성하고 관리하는 유틸리티
 */
export class TempFileManager {
  private static tempDir = path.join(process.cwd(), 'temp')

  /**
   * 임시 디렉토리 경로 반환
   */
  static getTempDir(): string {
    return this.tempDir
  }

  /**
   * 임시 디렉토리 초기화
   */
  static async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
      
      // 하위 디렉토리들도 생성
      const subDirs = ['extracted-pages', 'uploads', 'processed']
      for (const subDir of subDirs) {
        await fs.mkdir(path.join(this.tempDir, subDir), { recursive: true })
      }
    } catch (error) {
      console.error('임시 디렉토리 생성 실패:', error)
    }
  }

  /**
   * 오래된 임시 파일들을 정리 (1시간 이상 된 파일)
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const oneHourAgo = Date.now() - (60 * 60 * 1000) // 1시간
      
      const cleanupDir = async (dirPath: string) => {
        try {
          const files = await fs.readdir(dirPath)
          
          for (const file of files) {
            const filePath = path.join(dirPath, file)
            const stats = await fs.stat(filePath)
            
            if (stats.isFile() && stats.mtime.getTime() < oneHourAgo) {
              await fs.unlink(filePath)
              console.log(`🧹 오래된 임시 파일 삭제: ${file}`)
            }
          }
        } catch (error) {
          // 디렉토리가 없거나 접근할 수 없는 경우 무시
        }
      }

      // 각 하위 디렉토리 정리
      await cleanupDir(path.join(this.tempDir, 'extracted-pages'))
      await cleanupDir(path.join(this.tempDir, 'uploads'))
      await cleanupDir(path.join(this.tempDir, 'processed'))
      
    } catch (error) {
      console.warn('임시 파일 정리 중 오류:', error)
    }
  }

  /**
   * 특정 파일 삭제
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
      console.log(`🗑️ 임시 파일 삭제: ${path.basename(filePath)}`)
    } catch (error) {
      console.warn(`임시 파일 삭제 실패: ${filePath}`, error)
    }
  }
}

// 앱 시작 시 임시 디렉토리 초기화
TempFileManager.ensureTempDir()

// 주기적으로 오래된 파일 정리 (30분마다)
setInterval(() => {
  TempFileManager.cleanupOldFiles()
}, 30 * 60 * 1000)