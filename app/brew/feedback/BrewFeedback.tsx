"use client";
import { useState } from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Slider, 
  FormControlLabel, 
  Checkbox, 
  Button,
  TextField,
  Grid,
  Rating,
  Alert
} from "@mui/material";
import { BrewFormData } from "../workflow/types";

interface BrewFeedbackProps {
  brewData: BrewFormData;
  onSaveFeedback: (feedback: any) => void;
  previousFeedback?: any[];
}

export const BrewFeedback = ({ brewData, onSaveFeedback, previousFeedback = [] }: BrewFeedbackProps) => {
  const [strength, setStrength] = useState<number>(3);
  const [tooStrong, setTooStrong] = useState<boolean>(false);
  const [tooWeak, setTooWeak] = useState<boolean>(false);
  const [isSour, setIsSour] = useState<boolean>(false);
  const [isBitter, setIsBitter] = useState<boolean>(false);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [recommendedGrind, setRecommendedGrind] = useState<number | null>(null);
  const [recommendedRatio, setRecommendedRatio] = useState<number | null>(null);
  
  // Calculate recommendations based on feedback
  const calculateRecommendations = () => {
    let newGrind = brewData.grind;
    let newRatio = brewData.water / brewData.dose;
    
    // Adjust grind based on taste feedback
    if (isSour) {
      // If sour, recommend a finer grind (lower number)
      newGrind = Math.max(1, brewData.grind - 2);
    } else if (isBitter) {
      // If bitter, recommend a coarser grind (higher number)
      newGrind = brewData.grind + 2;
    }
    
    // Adjust ratio based on strength feedback
    if (tooStrong) {
      // If too strong, recommend more water (higher ratio)
      newRatio = Math.min(20, newRatio + 1);
    } else if (tooWeak) {
      // If too weak, recommend less water (lower ratio)
      newRatio = Math.max(10, newRatio - 1);
    }
    
    setRecommendedGrind(newGrind);
    setRecommendedRatio(newRatio);
  };
  
  const handleSubmit = () => {
    const feedback = {
      brew_id: Date.now(), // This would normally come from the database
      grind: brewData.grind,
      ratio: brewData.water / brewData.dose,
      too_strong: tooStrong,
      too_weak: tooWeak,
      is_sour: isSour,
      is_bitter: isBitter,
      overall_rating: overallRating,
      notes: notes,
      recommended_grind: recommendedGrind,
      recommended_ratio: recommendedRatio
    };
    
    onSaveFeedback(feedback);
  };
  
  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Brew Feedback
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              How was your coffee?
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography gutterBottom>Overall Rating</Typography>
              <Rating
                name="overall-rating"
                value={overallRating}
                onChange={(event, newValue) => {
                  setOverallRating(newValue);
                }}
                size="large"
                precision={0.5}
              />
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography gutterBottom>Strength</Typography>
              <Slider
                value={strength}
                onChange={(e, newValue) => setStrength(newValue as number)}
                step={1}
                marks
                min={1}
                max={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => {
                  return ['Very Weak', 'Weak', 'Perfect', 'Strong', 'Very Strong'][value - 1];
                }}
              />
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography gutterBottom>Taste Issues</Typography>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={tooStrong} 
                    onChange={(e) => {
                      setTooStrong(e.target.checked);
                      if (e.target.checked) setTooWeak(false);
                    }} 
                  />
                }
                label="Too Strong"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={tooWeak} 
                    onChange={(e) => {
                      setTooWeak(e.target.checked);
                      if (e.target.checked) setTooStrong(false);
                    }} 
                  />
                }
                label="Too Weak"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={isSour} 
                    onChange={(e) => {
                      setIsSour(e.target.checked);
                      if (e.target.checked) setIsBitter(false);
                    }} 
                  />
                }
                label="Sour"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={isBitter} 
                    onChange={(e) => {
                      setIsBitter(e.target.checked);
                      if (e.target.checked) setIsSour(false);
                    }} 
                  />
                }
                label="Bitter"
              />
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <TextField
                label="Tasting Notes"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                placeholder="Describe the flavor, body, acidity, etc."
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={calculateRecommendations}
                fullWidth
              >
                Get Recommendations
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSubmit}
                fullWidth
              >
                Save Feedback
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Brew Parameters
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>Grind Setting:</strong> {brewData.grind}
              </Typography>
              <Typography variant="body1">
                <strong>Coffee:</strong> {brewData.dose}g
              </Typography>
              <Typography variant="body1">
                <strong>Water:</strong> {brewData.water}ml
              </Typography>
              <Typography variant="body1">
                <strong>Ratio:</strong> 1:{Math.round(brewData.water / brewData.dose)}
              </Typography>
            </Box>
            
            {(recommendedGrind !== null || recommendedRatio !== null) && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Recommendations for Next Brew:
                </Typography>
                {recommendedGrind !== null && (
                  <Typography variant="body1">
                    <strong>Grind Setting:</strong> {recommendedGrind} {recommendedGrind < brewData.grind ? "(Finer)" : recommendedGrind > brewData.grind ? "(Coarser)" : ""}
                  </Typography>
                )}
                {recommendedRatio !== null && (
                  <Typography variant="body1">
                    <strong>Ratio:</strong> 1:{Math.round(recommendedRatio)} {recommendedRatio > brewData.water / brewData.dose ? "(More Water)" : recommendedRatio < brewData.water / brewData.dose ? "(Less Water)" : ""}
                  </Typography>
                )}
              </Alert>
            )}
          </Paper>
          
          {previousFeedback.length > 0 && (
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Previous Brew History
              </Typography>
              
              {previousFeedback.slice(0, 3).map((feedback, index) => (
                <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < 2 ? '1px solid #eee' : 'none' }}>
                  <Typography variant="subtitle1">
                    Brew #{feedback.brew_id}
                  </Typography>
                  <Typography variant="body2">
                    Grind: {feedback.grind} • Ratio: 1:{Math.round(feedback.ratio)}
                  </Typography>
                  <Rating value={feedback.overall_rating} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {feedback.too_strong ? "Too Strong • " : ""}
                    {feedback.too_weak ? "Too Weak • " : ""}
                    {feedback.is_sour ? "Sour • " : ""}
                    {feedback.is_bitter ? "Bitter" : ""}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
