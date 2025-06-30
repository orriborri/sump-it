'use client'
import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Rating,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Share, ContentCopy, Check } from '@mui/icons-material'
import { FormData } from '../types'
import Image from 'next/image'

interface QRCodeDisplayProps {
  url: string
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setQrCodeDataUrl(dataUrl)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    generateQRCode()
  }, [url])

  if (loading) {
    return (
      <Box
        sx={{ width: 200, height: 200, bgcolor: 'grey.200', borderRadius: 1 }}
      />
    )
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      {qrCodeDataUrl && (
        <Image
          src={qrCodeDataUrl}
          alt="QR Code for feedback sharing"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      )}
    </Box>
  )
}

interface EnhancedBrewFeedbackProps {
  brewData: FormData
  brewId?: number
  onSaveFeedback: (_feedback: any) => void
}

export const EnhancedBrewFeedback: React.FC<EnhancedBrewFeedbackProps> = ({
  brewData,
  brewId,
  onSaveFeedback,
}) => {
  const [feedback, setFeedback] = useState({
    overall_rating: 0,
    coffee_amount_ml: 0,
    too_strong: false,
    too_weak: false,
    is_sour: false,
    is_bitter: false,
    notes: '',
  })

  const [showQRDialog, setShowQRDialog] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate shareable URL for this brew
    if (brewId) {
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${baseUrl}/brew/${brewId}`
      setShareUrl(url)
    }
  }, [brewId])

  const handleFeedbackChange = (field: string, value: any) => {
    setFeedback(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = () => {
    onSaveFeedback(feedback)
  }

  const handleShare = () => {
    setShowQRDialog(true)
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const getBrewSummary = () => {
    return `${brewData.water}ml water, ${brewData.dose}g coffee, 1:${brewData.ratio} ratio, grind setting ${brewData.grind}`
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        How was your brew?
      </Typography>

      {/* Brew Summary */}
      <Card
        sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Brew Parameters
          </Typography>
          <Typography variant="body1">{getBrewSummary()}</Typography>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Overall Rating */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Overall Rating
              </Typography>
              <Rating
                value={feedback.overall_rating}
                onChange={(_, value) =>
                  handleFeedbackChange('overall_rating', value || 0)
                }
                size="large"
              />
            </Box>

            <Divider />

            {/* Coffee Amount */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                How much coffee did you get? (optional)
              </Typography>
              <TextField
                type="number"
                value={feedback.coffee_amount_ml}
                onChange={e =>
                  handleFeedbackChange(
                    'coffee_amount_ml',
                    parseInt(e.target.value) || 0
                  )
                }
                label="Amount in ml"
                variant="outlined"
                size="small"
                sx={{ width: 150 }}
              />
            </Box>

            <Divider />

            {/* Taste Feedback */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Taste Feedback
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.too_strong}
                      onChange={e =>
                        handleFeedbackChange('too_strong', e.target.checked)
                      }
                    />
                  }
                  label="Too strong"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.too_weak}
                      onChange={e =>
                        handleFeedbackChange('too_weak', e.target.checked)
                      }
                    />
                  }
                  label="Too weak"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.is_sour}
                      onChange={e =>
                        handleFeedbackChange('is_sour', e.target.checked)
                      }
                    />
                  }
                  label="Sour"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.is_bitter}
                      onChange={e =>
                        handleFeedbackChange('is_bitter', e.target.checked)
                      }
                    />
                  }
                  label="Bitter"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Additional Notes */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Additional Notes (optional)
              </Typography>
              <TextField
                multiline
                rows={3}
                value={feedback.notes}
                onChange={e => handleFeedbackChange('notes', e.target.value)}
                placeholder="Any other observations about this brew..."
                variant="outlined"
                fullWidth
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="outlined"
          startIcon={<Share />}
          onClick={handleShare}
          disabled={!brewId}
        >
          Share for Feedback
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          size="large"
        >
          Save Feedback & Continue
        </Button>
      </Stack>

      {/* Sharing Dialog */}
      <Dialog
        open={showQRDialog}
        onClose={() => setShowQRDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Your Brew for Feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={3} alignItems="center">
            <Typography variant="body1" textAlign="center">
              Others can scan this QR code or use the link to provide feedback
              on your brew
            </Typography>

            {shareUrl && <QRCodeDisplay url={shareUrl} />}

            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>
                Share Link:
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  value={shareUrl}
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                  <IconButton
                    onClick={handleCopyUrl}
                    color={copied ? 'success' : 'default'}
                  >
                    {copied ? <Check /> : <ContentCopy />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Alert severity="info" sx={{ width: '100%' }}>
              <Typography variant="body2">
                <strong>Brew Details:</strong> {getBrewSummary()}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
