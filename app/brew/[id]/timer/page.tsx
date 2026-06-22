'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Typography, Button, Stack, Paper } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

/**
 * Client-side brew timer page that counts elapsed brew time
 * Provides play/pause controls and navigates to the rating page with timing data when done
 */
export default function TimerPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  /**
   * Toggles the timer between running and paused states
   */
  const togglePause = () => {
    setIsRunning(prev => !prev)
  }

  /**
   * Navigates to the rating page with the current brew time as a query parameter
   */
  const handleDone = () => {
    router.push(`/brew/${id}/rate?brew_time=${elapsedSeconds}`)
  }

  /**
   * Skips the timer and navigates directly to the rating page without timing data
   */
  const handleSkip = () => {
    router.push(`/brew/${id}/rate`)
  }

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <Box
      sx={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 3,
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 500,
          textAlign: 'center',
          backgroundColor: '#F5F5DC',
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h5"
          sx={{ color: '#8B4513', mb: 3, fontWeight: 600 }}
        >
          Brew Timer
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#8B4513',
            my: 4,
            fontSize: { xs: '3.5rem', sm: '5rem' },
          }}
        >
          {formattedTime}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          {isRunning ? 'Brewing in progress...' : 'Timer paused'}
        </Typography>

        <Stack spacing={2} alignItems="center">
          <Button
            variant="outlined"
            onClick={togglePause}
            startIcon={isRunning ? <PauseIcon /> : <PlayArrowIcon />}
            sx={{
              borderColor: '#8B4513',
              color: '#8B4513',
              '&:hover': {
                borderColor: '#6B3410',
                backgroundColor: 'rgba(139, 69, 19, 0.04)',
              },
              width: 200,
            }}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </Button>

          <Button
            variant="contained"
            onClick={handleDone}
            startIcon={<CheckCircleIcon />}
            sx={{
              backgroundColor: '#8B4513',
              '&:hover': { backgroundColor: '#6B3410' },
              width: 200,
            }}
          >
            Done Brewing
          </Button>

          <Button
            variant="text"
            onClick={handleSkip}
            startIcon={<SkipNextIcon />}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: '#8B4513' },
            }}
          >
            Skip
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
