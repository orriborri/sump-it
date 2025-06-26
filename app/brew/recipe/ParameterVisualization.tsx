"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  Grid,
  Button,
  Stack,
  Chip,
} from "@mui/material";
import { BrewWithFeedback } from "../workflow/enhanced-actions";

interface ParameterVisualizationProps {
  brews: BrewWithFeedback[];
  onParameterSelect: (params: { water: number; dose: number; grind: number; ratio: number }) => void;
}

export const ParameterVisualization: React.FC<ParameterVisualizationProps> = ({
  brews,
  onParameterSelect,
}) => {
  // Calculate parameter ranges from historical data
  const getParameterRange = (param: keyof Pick<BrewWithFeedback, 'water' | 'dose' | 'grind' | 'ratio'>) => {
    const values = brews.map(brew => brew[param]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return { min, max, avg };
  };

  const waterRange = getParameterRange('water');
  const doseRange = getParameterRange('dose');
  const grindRange = getParameterRange('grind');
  const ratioRange = getParameterRange('ratio');

  // State for interactive parameter adjustment
  const [adjustedParams, setAdjustedParams] = useState({
    water: waterRange.avg,
    dose: doseRange.avg,
    grind: grindRange.avg,
    ratio: ratioRange.avg,
  });

  const handleParameterChange = (param: string, value: number) => {
    setAdjustedParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleUseParameters = () => {
    onParameterSelect(adjustedParams);
  };

  // Find similar brews based on current parameters
  const getSimilarBrews = () => {
    return brews
      .map(brew => ({
        ...brew,
        similarity: calculateSimilarity(brew, adjustedParams)
      }))
      .filter(brew => brew.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  };

  const calculateSimilarity = (brew: BrewWithFeedback, params: typeof adjustedParams) => {
    const waterDiff = Math.abs(brew.water - params.water) / Math.max(brew.water, params.water);
    const doseDiff = Math.abs(brew.dose - params.dose) / Math.max(brew.dose, params.dose);
    const grindDiff = Math.abs(brew.grind - params.grind) / Math.max(brew.grind, params.grind);
    const ratioDiff = Math.abs(brew.ratio - params.ratio) / Math.max(brew.ratio, params.ratio);
    
    return 1 - (waterDiff + doseDiff + grindDiff + ratioDiff) / 4;
  };

  const getParameterDistribution = (param: keyof Pick<BrewWithFeedback, 'water' | 'dose' | 'grind' | 'ratio'>) => {
    const goodBrews = brews.filter(brew => 
      brew.feedback?.overall_rating && brew.feedback.overall_rating >= 4
    );
    const badBrews = brews.filter(brew => 
      brew.feedback?.overall_rating && brew.feedback.overall_rating < 4
    );

    return { goodBrews, badBrews };
  };

  const similarBrews = getSimilarBrews();

  return (
    <Card sx={{ p: 2, bgcolor: 'background.paper' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Interactive Parameter Tuning
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Adjust parameters and see how they compare to your brewing history
        </Typography>

        <Grid container spacing={3}>
          {/* Parameter Sliders */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Water Slider */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Water: {adjustedParams.water}ml
                </Typography>
                <Slider
                  value={adjustedParams.water}
                  min={Math.max(waterRange.min - 50, 50)}
                  max={waterRange.max + 50}
                  step={10}
                  onChange={(_, value) => handleParameterChange('water', value as number)}
                  marks={[
                    { value: waterRange.min, label: `Min: ${waterRange.min}` },
                    { value: waterRange.avg, label: `Avg: ${waterRange.avg}` },
                    { value: waterRange.max, label: `Max: ${waterRange.max}` },
                  ]}
                />
              </Box>

              {/* Dose Slider */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Coffee Dose: {adjustedParams.dose}g
                </Typography>
                <Slider
                  value={adjustedParams.dose}
                  min={Math.max(doseRange.min - 5, 5)}
                  max={doseRange.max + 5}
                  step={1}
                  onChange={(_, value) => handleParameterChange('dose', value as number)}
                  marks={[
                    { value: doseRange.min, label: `Min: ${doseRange.min}` },
                    { value: doseRange.avg, label: `Avg: ${doseRange.avg}` },
                    { value: doseRange.max, label: `Max: ${doseRange.max}` },
                  ]}
                />
              </Box>

              {/* Grind Slider */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Grind Setting: {adjustedParams.grind}
                </Typography>
                <Slider
                  value={adjustedParams.grind}
                  min={Math.max(grindRange.min - 5, 1)}
                  max={grindRange.max + 5}
                  step={1}
                  onChange={(_, value) => handleParameterChange('grind', value as number)}
                  marks={[
                    { value: grindRange.min, label: `Min: ${grindRange.min}` },
                    { value: grindRange.avg, label: `Avg: ${grindRange.avg}` },
                    { value: grindRange.max, label: `Max: ${grindRange.max}` },
                  ]}
                />
              </Box>

              {/* Ratio Slider */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Ratio: 1:{adjustedParams.ratio}
                </Typography>
                <Slider
                  value={adjustedParams.ratio}
                  min={Math.max(ratioRange.min - 2, 10)}
                  max={ratioRange.max + 2}
                  step={1}
                  onChange={(_, value) => handleParameterChange('ratio', value as number)}
                  marks={[
                    { value: ratioRange.min, label: `Min: 1:${ratioRange.min}` },
                    { value: ratioRange.avg, label: `Avg: 1:${ratioRange.avg}` },
                    { value: ratioRange.max, label: `Max: 1:${ratioRange.max}` },
                  ]}
                />
              </Box>
            </Stack>

            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                onClick={handleUseParameters}
                size="large"
              >
                Use These Parameters
              </Button>
            </Box>
          </Grid>

          {/* Similar Brews Preview */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Similar Previous Brews
            </Typography>
            {similarBrews.length > 0 ? (
              <Stack spacing={1}>
                {similarBrews.map((brew) => (
                  <Card 
                    key={brew.id} 
                    variant="outlined" 
                    sx={{ 
                      p: 1,
                      bgcolor: brew.feedback?.overall_rating && brew.feedback.overall_rating >= 4 
                        ? 'success.light' 
                        : 'background.paper',
                      opacity: 0.8 + (brew.similarity * 0.2)
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption">
                        Brew #{brew.id}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip 
                          label={`${Math.round(brew.similarity * 100)}%`} 
                          size="small" 
                          color="primary"
                        />
                        {brew.feedback?.overall_rating && (
                          <Chip 
                            label={`${brew.feedback.overall_rating}★`} 
                            size="small"
                            color={brew.feedback.overall_rating >= 4 ? 'success' : 'default'}
                          />
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {brew.water}ml • {brew.dose}g • 1:{brew.ratio} • Grind {brew.grind}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No similar brews found with current parameters
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
