'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Star, Clock, CheckCircle2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitProviderFeedback, type ProviderFeedback } from '@/lib/forms/services-actions'

interface FeedbackFormProps {
  token: string
  onComplete: () => void
  onSkip: () => void
}

// Star Rating Component
function StarRating({
  value,
  onChange,
  label,
}: {
  value: number | undefined
  onChange: (val: number) => void
  label: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                (hovered !== null ? star <= hovered : star <= (value || 0))
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// NPS Score Component (0-10)
function NPSScore({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (val: number) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        Qual a probabilidade de recomendar a FIXO a um colega?
      </p>
      <div className="flex gap-1 flex-wrap">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              'w-9 h-9 rounded-md text-sm font-medium transition-all border',
              value === score
                ? score <= 6
                  ? 'bg-red-500 text-white border-red-600'
                  : score <= 8
                    ? 'bg-yellow-500 text-white border-yellow-600'
                    : 'bg-green-500 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 px-1">
        <span>Pouco provável</span>
        <span>Muito provável</span>
      </div>
    </div>
  )
}

// Time Perception Chips
function TimePerceptionChips({
  value,
  onChange,
}: {
  value: 'quick' | 'adequate' | 'long' | undefined
  onChange: (val: 'quick' | 'adequate' | 'long') => void
}) {
  const options: { value: 'quick' | 'adequate' | 'long'; label: string }[] = [
    { value: 'quick', label: 'Rápido' },
    { value: 'adequate', label: 'Adequado' },
    { value: 'long', label: 'Demorado' },
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Como sentiu o tempo de preenchimento?
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all border',
              value === option.value
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FeedbackForm({ token, onComplete, onSkip }: FeedbackFormProps) {
  const [npsScore, setNpsScore] = useState<number | undefined>()
  const [easeOfUse, setEaseOfUse] = useState<number | undefined>()
  const [clarity, setClarity] = useState<number | undefined>()
  const [timeSpent, setTimeSpent] = useState<number | undefined>()
  const [timePerception, setTimePerception] = useState<'quick' | 'adequate' | 'long' | undefined>()
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    const feedback: ProviderFeedback = {
      nps_score: npsScore,
      ratings: {
        ease_of_use: easeOfUse,
        clarity: clarity,
        time_spent: timeSpent,
      },
      time_perception: timePerception,
      comment: comment.trim() || undefined,
    }

    const result = await submitProviderFeedback(token, feedback)

    if (result.success) {
      onComplete()
    } else {
      setError(result.error || 'Erro ao enviar feedback')
    }

    setIsSubmitting(false)
  }

  const handleSkip = async () => {
    setIsSubmitting(true)

    // Save as skipped
    await submitProviderFeedback(token, { skipped: true })

    onSkip()
    setIsSubmitting(false)
  }

  const hasAnyFeedback =
    npsScore !== undefined ||
    easeOfUse !== undefined ||
    clarity !== undefined ||
    timeSpent !== undefined ||
    timePerception !== undefined ||
    comment.trim().length > 0

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
          <MessageSquare className="h-5 w-5 text-red-600" />
          O seu feedback é importante
        </CardTitle>
        <CardDescription>
          Ajude-nos a melhorar o processo de registo. Este passo é totalmente opcional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* NPS Score */}
        <NPSScore value={npsScore} onChange={setNpsScore} />

        {/* Star Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StarRating
            value={easeOfUse}
            onChange={setEaseOfUse}
            label="Facilidade de preenchimento"
          />
          <StarRating
            value={clarity}
            onChange={setClarity}
            label="Clareza das instruções"
          />
          <StarRating
            value={timeSpent}
            onChange={setTimeSpent}
            label="Tempo de preenchimento"
          />
        </div>

        {/* Time Perception */}
        <TimePerceptionChips value={timePerception} onChange={setTimePerception} />

        {/* Comment */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Tem sugestões para melhorar este processo? (opcional)
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva aqui as suas sugestões..."
            rows={3}
            className="resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyFeedback}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              'A enviar...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Enviar Feedback
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1"
          >
            Saltar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
