"use client";
import React from "react";
import {
  Box,
  Typography,
  Stack,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { FormData } from "../workflow/types";
import { SmartRecipe } from "./SmartRecipe";
import { GrindSettingInput } from "../brew-parameters/GrindSettingInput";
import { WaterDoseInputGroup } from "../brew-parameters/WaterDoseInputGroup";

interface ComprehensiveRecipeProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
}

export const ComprehensiveRecipe: React.FC<ComprehensiveRecipeProps> = ({
  formData,
  updateFormData,
}) => {
  const isRecipeComplete = !!(
    formData.water && 
    formData.dose && 
    formData.grind && 
    formData.ratio
  );

  const getCompletionStatus = () => {
    const completed = [];
    const missing = [];
    
    if (formData.water && formData.dose && formData.ratio) {
      completed.push("Water & Dose");
    } else {
      missing.push("Water & Dose");
    }
    
    if (formData.grind) {
      completed.push("Grind Setting");
    } else {
      missing.push("Grind Setting");
    }
    
    return { completed, missing };
  };


  return (
    <Box>
 

      <Stack spacing={3}>
        {/* Smart Recommendations */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">
              Smart Recommendations
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SmartRecipe
              formData={formData}
              updateFormData={updateFormData}
            />
          </AccordionDetails>
        </Accordion>

        <Divider />

        {/* Manual Parameter Setting */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Fine-tune Your Recipe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adjust the parameters below or use the recommendations above.
          </Typography>

          <Stack spacing={4}>
            {/* Grind Setting */}
            <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Grind Setting
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set your grinder to the recommended setting or adjust based on your preference.
              </Typography>
              <GrindSettingInput
                formData={formData}
                updateFormData={updateFormData}
                grinderId={formData.grinder_id}
              />
            </Paper>

            {/* Water & Dose */}
            <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Water & Coffee Dose
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set the amount of water and coffee for your brew.
              </Typography>
              <WaterDoseInputGroup
                formData={formData}
                updateFormData={updateFormData}
              />
            </Paper>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
