'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  Chip,
  Paper,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CoffeeIcon from '@mui/icons-material/Coffee'
import { addGrinder, addBean, addMethod } from '@/app/manage/actions'

const steps = ['Welcome', 'Add Grinder', 'Add Beans', 'Add Method', 'Done']

const COMMON_METHODS = ['V60', 'AeroPress', 'French Press', 'Chemex', 'Kalita Wave']

export const OnboardingWizard: React.FC = () => {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)
  const [grinderName, setGrinderName] = useState('')
  const [beanName, setBeanName] = useState('')
  const [roastery, setRoastery] = useState('')
  const [methodName, setMethodName] = useState('')
  const [useCustomMethod, setUseCustomMethod] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({})

  const handleNext = () => {
    setActiveStep((prev) => prev + 1)
    setError(null)
  }

  const handleAddGrinder = async () => {
    if (!grinderName.trim()) {
      setError('Grinder name is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addGrinder({ name: grinderName.trim() })
      setCompletedItems((prev) => ({ ...prev, 1: true }))
      setTimeout(() => handleNext(), 600)
    } catch (_err) {
      setError('Failed to add grinder. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBean = async () => {
    if (!beanName.trim()) {
      setError('Bean name is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addBean({
        name: beanName.trim(),
        ...(roastery.trim() ? { rostery: roastery.trim() } : {}),
      })
      setCompletedItems((prev) => ({ ...prev, 2: true }))
      setTimeout(() => handleNext(), 600)
    } catch (_err) {
      setError('Failed to add beans. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMethod = async (name?: string) => {
    const finalName = name || methodName.trim()
    if (!finalName) {
      setError('Method name is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addMethod({ name: finalName })
      setCompletedItems((prev) => ({ ...prev, 3: true }))
      setTimeout(() => handleNext(), 600)
    } catch (_err) {
      setError('Failed to add method. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    router.refresh()
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CoffeeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Welcome to Sump It!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Let&apos;s set up your first brew. We&apos;ll add your grinder,
              coffee beans, and brew method so you can start tracking your
              brews right away.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              sx={{ mt: 2 }}
            >
              Get Started
            </Button>
          </Box>
        )

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Add Your Grinder
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              What grinder do you use? (e.g. Comandante C40, Baratza Encore)
            </Typography>
            {completedItems[1] ? (
              <Alert
                icon={<CheckCircleIcon />}
                severity="success"
                sx={{ mb: 2 }}
              >
                Grinder added successfully!
              </Alert>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Grinder Name"
                  value={grinderName}
                  onChange={(e) => setGrinderName(e.target.value)}
                  placeholder="e.g. Comandante C40"
                  sx={{ mb: 2 }}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddGrinder()
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddGrinder}
                  disabled={loading || !grinderName.trim()}
                  fullWidth
                >
                  {loading ? 'Adding...' : 'Add Grinder'}
                </Button>
              </>
            )}
          </Box>
        )

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Add Your Coffee Beans
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              What coffee are you brewing with?
            </Typography>
            {completedItems[2] ? (
              <Alert
                icon={<CheckCircleIcon />}
                severity="success"
                sx={{ mb: 2 }}
              >
                Beans added successfully!
              </Alert>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Bean Name"
                  value={beanName}
                  onChange={(e) => setBeanName(e.target.value)}
                  placeholder="e.g. Ethiopia Yirgacheffe"
                  sx={{ mb: 2 }}
                  disabled={loading}
                  required
                />
                <TextField
                  fullWidth
                  label="Roastery (optional)"
                  value={roastery}
                  onChange={(e) => setRoastery(e.target.value)}
                  placeholder="e.g. Square Mile"
                  sx={{ mb: 2 }}
                  disabled={loading}
                />
                <Button
                  variant="contained"
                  onClick={handleAddBean}
                  disabled={loading || !beanName.trim()}
                  fullWidth
                >
                  {loading ? 'Adding...' : 'Add Beans'}
                </Button>
              </>
            )}
          </Box>
        )

      case 3:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Add a Brew Method
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Pick a common method or add your own.
            </Typography>
            {completedItems[3] ? (
              <Alert
                icon={<CheckCircleIcon />}
                severity="success"
                sx={{ mb: 2 }}
              >
                Method added successfully!
              </Alert>
            ) : (
              <>
                {!useCustomMethod && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {COMMON_METHODS.map((method) => (
                      <Chip
                        key={method}
                        label={method}
                        onClick={() => handleAddMethod(method)}
                        disabled={loading}
                        sx={{
                          fontSize: '0.95rem',
                          py: 2.5,
                          px: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}
                {!useCustomMethod && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setUseCustomMethod(true)}
                    sx={{ mb: 1 }}
                  >
                    Or add a custom method
                  </Button>
                )}
                {useCustomMethod && (
                  <>
                    <TextField
                      fullWidth
                      label="Method Name"
                      value={methodName}
                      onChange={(e) => setMethodName(e.target.value)}
                      placeholder="e.g. Clever Dripper"
                      sx={{ mb: 2 }}
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMethod()
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleAddMethod()}
                      disabled={loading || !methodName.trim()}
                      fullWidth
                    >
                      {loading ? 'Adding...' : 'Add Method'}
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setUseCustomMethod(false)}
                      sx={{ mt: 1 }}
                    >
                      Back to common methods
                    </Button>
                  </>
                )}
              </>
            )}
          </Box>
        )

      case 4:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon
              sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
            />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              You&apos;re All Set!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Your equipment is ready. Time to brew your first cup!
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleFinish}
              sx={{ mt: 2 }}
            >
              Start Brewing
            </Button>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 600,
        mx: 'auto',
        mt: 2,
      }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          mb: 3,
          display: { xs: 'none', sm: 'flex' },
        }}
      >
        {steps.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Mobile step indicator */}
      <Typography
        variant="body2"
        sx={{
          display: { xs: 'block', sm: 'none' },
          textAlign: 'center',
          mb: 2,
          color: 'text.secondary',
        }}
      >
        Step {activeStep + 1} of {steps.length}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderStepContent()}
    </Paper>
  )
}
