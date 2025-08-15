/**
 * Gemini AI Client for Self-Learning Agent
 * Temperature: 0.1 for maximum precision
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface PredictionAnalysis {
  matchId: number
  predicted: string
  actual: string
  confidence: number
  features: Record<string, number>
  correct: boolean
}

export interface ImprovementSuggestion {
  type: 'weight_adjustment' | 'new_feature' | 'temporal_change'
  description: string
  expectedImprovement: number
  implementation: Record<string, any>
}

export interface AnalysisResult {
  accuracy: number
  suggestions: ImprovementSuggestion[]
  patterns: {
    highConfidenceFailures: number
    featureOutliers: number
    commonMistakes: string[]
  }
}

class GeminiClient {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null
  private temperature = 0.1
  private analysisBuffer: PredictionAnalysis[] = []
  private readonly BUFFER_SIZE = 100

  constructor() {
    this.initialize()
  }

  private initialize() {
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      console.warn('Gemini API key not set. Running in analysis-only mode.')
      return
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey)
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          temperature: this.temperature,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
      })
      console.log('Gemini client initialized with temperature:', this.temperature)
    } catch (error) {
      console.error('Failed to initialize Gemini:', error)
    }
  }

  /**
   * Add prediction to analysis buffer
   */
  addPrediction(prediction: PredictionAnalysis) {
    this.analysisBuffer.push(prediction)
    
    // Trigger analysis when buffer is full
    if (this.analysisBuffer.length >= this.BUFFER_SIZE) {
      this.analyzePerformance()
    }
  }

  /**
   * Analyze performance and generate improvement suggestions
   */
  async analyzePerformance(): Promise<AnalysisResult> {
    const predictions = [...this.analysisBuffer]
    this.analysisBuffer = [] // Clear buffer

    // Calculate metrics
    const correct = predictions.filter(p => p.correct).length
    const accuracy = correct / predictions.length

    // Identify patterns
    const patterns = this.identifyPatterns(predictions)

    // Generate suggestions if Gemini is available
    let suggestions: ImprovementSuggestion[] = []
    if (this.model && patterns.highConfidenceFailures > 5) {
      suggestions = await this.generateSuggestions(predictions, patterns)
    }

    return {
      accuracy,
      suggestions,
      patterns
    }
  }

  /**
   * Identify patterns in mispredictions
   */
  private identifyPatterns(predictions: PredictionAnalysis[]) {
    const mispredictions = predictions.filter(p => !p.correct)
    
    const highConfidenceFailures = mispredictions.filter(p => p.confidence > 0.7).length
    const featureOutliers = mispredictions.filter(p => 
      Math.abs(p.features.shot_diff || 0) > 5 ||
      Math.abs(p.features.elo_diff || 0) > 200
    ).length

    const mistakeTypes: Record<string, number> = {}
    mispredictions.forEach(p => {
      const key = `${p.predicted}_to_${p.actual}`
      mistakeTypes[key] = (mistakeTypes[key] || 0) + 1
    })

    const commonMistakes = Object.entries(mistakeTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type)

    return {
      highConfidenceFailures,
      featureOutliers,
      commonMistakes
    }
  }

  /**
   * Generate improvement suggestions using Gemini
   */
  private async generateSuggestions(
    predictions: PredictionAnalysis[],
    patterns: any
  ): Promise<ImprovementSuggestion[]> {
    if (!this.model) return []

    const prompt = `
    Analyze these football match prediction failures with temperature 0.1 for maximum precision.
    
    Performance Summary:
    - Total predictions: ${predictions.length}
    - Accuracy: ${(predictions.filter(p => p.correct).length / predictions.length * 100).toFixed(1)}%
    - High confidence failures: ${patterns.highConfidenceFailures}
    - Feature outliers: ${patterns.featureOutliers}
    - Common mistakes: ${patterns.commonMistakes.join(', ')}
    
    Current features (80/20 principle):
    1. Shots on Target Difference (14.2% importance)
    2. Home Advantage (13.5% importance)
    3. Recent Form (11% importance)
    4. Team Strength/Elo (9% importance)
    5. Head-to-Head (6% importance)
    
    Sample mispredictions:
    ${predictions.filter(p => !p.correct).slice(0, 5).map(p => 
      `- Predicted ${p.predicted}, Actual ${p.actual}, Confidence ${p.confidence.toFixed(2)}, Features: ${JSON.stringify(p.features)}`
    ).join('\n')}
    
    Generate EXACTLY 3 specific improvements in JSON format:
    [
      {
        "type": "weight_adjustment",
        "description": "Specific feature weight change",
        "expectedImprovement": 0.02,
        "implementation": {"feature": "shot_diff", "multiplier": 1.15}
      },
      {
        "type": "new_feature",
        "description": "New interaction term",
        "expectedImprovement": 0.015,
        "implementation": {"formula": "shot_diff * home_advantage"}
      },
      {
        "type": "temporal_change",
        "description": "Temporal adjustment",
        "expectedImprovement": 0.01,
        "implementation": {"decay_weights": [2.5, 2.0, 1.5, 1.0, 0.8]}
      }
    ]
    `

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0])
        return suggestions
      }
    } catch (error) {
      console.error('Gemini suggestion generation failed:', error)
    }

    return []
  }

  /**
   * Test improvement suggestions
   */
  async testImprovements(
    suggestions: ImprovementSuggestion[],
    testData: any[]
  ): Promise<{ baseline: number; improved: number }> {
    // This would be implemented with actual model testing
    // For now, return mock results
    const baseline = 0.533
    const totalImprovement = suggestions.reduce((sum, s) => sum + s.expectedImprovement, 0)
    const improved = Math.min(baseline + totalImprovement, 0.75)

    return { baseline, improved }
  }

  /**
   * Get current analysis status
   */
  getStatus() {
    return {
      bufferSize: this.analysisBuffer.length,
      bufferCapacity: this.BUFFER_SIZE,
      geminiEnabled: !!this.model,
      temperature: this.temperature
    }
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient()

// Export types
export type { GeminiClient }